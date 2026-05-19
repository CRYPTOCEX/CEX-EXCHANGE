export const loadGoogleAuthScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot load Google Auth script on server side"));
      return;
    }

    // Check if script is already loaded
    if (window.document.getElementById("google-auth-script")) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.id = "google-auth-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve();
    };

    script.onerror = () => {
      reject(new Error("Failed to load Google Auth script"));
    };

    document.body.appendChild(script);
  });
};

export const initializeGoogleAuth = (clientId: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Cannot initialize Google Auth on server side"));
      return;
    }

    try {
      loadGoogleAuthScript()
        .then(() => {
          const { google } = window as any;
          if (!google || !google.accounts) {
            reject(new Error("Google accounts API not available"));
            return;
          }

          resolve(google.accounts);
        })
        .catch(reject);
    } catch (error) {
      reject(error);
    }
  });
};

export interface GoogleAuthResponse {
  credential?: string;
  access_token?: string;
  user_info?: {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };
}

export const openGoogleLoginPopup = async (
  clientId: string
): Promise<string | GoogleAuthResponse> => {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error("Google Client ID is not configured"));
      return;
    }

    // Add timeout to handle user cancellation
    const timeout = setTimeout(() => {
      reject(new Error("Google authentication was cancelled or timed out"));
    }, 120000); // 120 second timeout for slower mobile connections

    initializeGoogleAuth(clientId)
      .then((googleAccounts) => {
        let isResolved = false;

        const handleCallback = (response: any) => {
          if (isResolved) return;

          clearTimeout(timeout);
          isResolved = true;

          if (response.error) {
            reject(new Error(response.error));
            return;
          }

          if (response.credential) {
            resolve(response.credential);
            return;
          }

          reject(new Error("No credential received from Google"));
        };

        // Initialize with callback
        googleAccounts.id.initialize({
          client_id: clientId,
          callback: handleCallback,
          auto_select: false,
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: true, // Use FedCM for better mobile support
        });

        // Use prompt() which shows account chooser on mobile
        // This is more reliable than renderButton + click approach
        googleAccounts.id.prompt((notification: any) => {
          if (isResolved) return;

          // Check different dismissal states
          if (notification.isNotDisplayed()) {
            const reason = notification.getNotDisplayedReason();
            console.log("Google One Tap not displayed:", reason);

            // If One Tap can't display (common on mobile), fall back to button approach
            if (reason === "opt_out_or_no_session" ||
                reason === "suppressed_by_user" ||
                reason === "unregistered_origin" ||
                reason === "unknown_reason") {
              // Fall back to OAuth popup approach for mobile
              fallbackToOAuthPopup(clientId, handleCallback, () => {
                if (!isResolved) {
                  clearTimeout(timeout);
                  isResolved = true;
                  reject(new Error("Google authentication was cancelled"));
                }
              });
              return;
            }

            clearTimeout(timeout);
            isResolved = true;
            reject(new Error(`Google Sign-In not available: ${reason}`));
            return;
          }

          if (notification.isSkippedMoment()) {
            const reason = notification.getSkippedReason();
            console.log("Google One Tap skipped:", reason);

            // User has multiple accounts or skipped - use button fallback
            if (reason === "user_cancel" || reason === "tap_outside" || reason === "issuing_failed") {
              clearTimeout(timeout);
              isResolved = true;
              reject(new Error("Google authentication was cancelled"));
              return;
            }

            // Fall back to OAuth popup for other skip reasons
            fallbackToOAuthPopup(clientId, handleCallback, () => {
              if (!isResolved) {
                clearTimeout(timeout);
                isResolved = true;
                reject(new Error("Google authentication was cancelled"));
              }
            });
            return;
          }

          if (notification.isDismissedMoment()) {
            const reason = notification.getDismissedReason();
            console.log("Google One Tap dismissed:", reason);
            clearTimeout(timeout);
            isResolved = true;
            reject(new Error("Google authentication was cancelled"));
            return;
          }
        });
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
};

// Fallback OAuth popup approach for when One Tap doesn't work (common on mobile)
function fallbackToOAuthPopup(
  clientId: string,
  onSuccess: (response: any) => void,
  onCancel: () => void
) {
  const { google } = window as any;

  if (!google?.accounts?.oauth2) {
    onCancel();
    return;
  }

  // Use the OAuth2 code flow with popup
  const client = google.accounts.oauth2.initCodeClient({
    client_id: clientId,
    scope: "email profile openid",
    ux_mode: "popup",
    callback: async (response: any) => {
      if (response.error) {
        console.error("OAuth error:", response.error);
        onCancel();
        return;
      }

      if (response.code) {
        // We have an auth code, but we need to exchange it for an ID token
        // For simplicity, let's try the token client instead
        tryTokenClient(clientId, onSuccess, onCancel);
        return;
      }

      onCancel();
    },
    error_callback: (error: any) => {
      console.error("OAuth popup error:", error);
      onCancel();
    },
  });

  // For mobile, token client with popup is more reliable
  tryTokenClient(clientId, onSuccess, onCancel);
}

// Use token client for popup-based auth
function tryTokenClient(
  clientId: string,
  onSuccess: (response: any) => void,
  onCancel: () => void
) {
  const { google } = window as any;

  if (!google?.accounts?.oauth2) {
    // Last resort: create a visible Google button
    createVisibleGoogleButton(clientId, onSuccess, onCancel);
    return;
  }

  const tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "email profile openid",
    callback: (tokenResponse: any) => {
      if (tokenResponse.error) {
        console.error("Token error:", tokenResponse.error);
        onCancel();
        return;
      }

      if (tokenResponse.access_token) {
        // We have an access token - fetch user info and create a pseudo-credential
        // The backend will need to handle this differently
        fetchGoogleUserInfo(tokenResponse.access_token)
          .then((userInfo) => {
            // Create a response object that mimics the credential response
            // The backend should detect this format and handle accordingly
            onSuccess({
              credential: null,
              access_token: tokenResponse.access_token,
              user_info: userInfo
            });
          })
          .catch(() => onCancel());
        return;
      }

      onCancel();
    },
    error_callback: (error: any) => {
      console.error("Token client error:", error);
      // Last resort: create a visible Google button
      createVisibleGoogleButton(clientId, onSuccess, onCancel);
    },
  });

  tokenClient.requestAccessToken();
}

// Create a visible Google button as absolute last resort
function createVisibleGoogleButton(
  clientId: string,
  onSuccess: (response: any) => void,
  onCancel: () => void
) {
  const { google } = window as any;

  if (!google?.accounts?.id) {
    onCancel();
    return;
  }

  // Re-initialize to ensure callback is set
  google.accounts.id.initialize({
    client_id: clientId,
    callback: onSuccess,
    auto_select: false,
  });

  // Create a modal overlay with a real Google button
  const overlay = document.createElement('div');
  overlay.id = 'google-auth-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 99999;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: white;
    padding: 24px;
    border-radius: 12px;
    text-align: center;
    max-width: 320px;
    width: 90%;
  `;

  const title = document.createElement('p');
  title.textContent = 'Sign in with Google';
  title.style.cssText = 'margin: 0 0 16px 0; font-size: 16px; font-weight: 500; color: #333;';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = 'display: flex; justify-content: center;';

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Cancel';
  cancelBtn.style.cssText = `
    margin-top: 16px;
    padding: 8px 16px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
    font-size: 14px;
    color: #666;
  `;
  cancelBtn.onclick = () => {
    overlay.remove();
    onCancel();
  };

  modal.appendChild(title);
  modal.appendChild(buttonContainer);
  modal.appendChild(cancelBtn);
  overlay.appendChild(modal);

  // Close on backdrop click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.remove();
      onCancel();
    }
  };

  document.body.appendChild(overlay);

  // Render the real Google button
  google.accounts.id.renderButton(buttonContainer, {
    theme: 'outline',
    size: 'large',
    type: 'standard',
    shape: 'rectangular',
    text: 'signin_with',
    logo_alignment: 'center',
    width: 250,
  });

  // Remove overlay when auth completes
  const originalCallback = onSuccess;
  onSuccess = (response: any) => {
    overlay.remove();
    originalCallback(response);
  };
}

// Fetch user info from Google API using access token
async function fetchGoogleUserInfo(accessToken: string): Promise<any> {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user info');
  }

  return response.json();
}
