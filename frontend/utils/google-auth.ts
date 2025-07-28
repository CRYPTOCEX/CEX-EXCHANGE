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

export const openGoogleLoginPopup = async (
  clientId: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error("Google Client ID is not configured"));
      return;
    }

    // Add timeout to handle user cancellation
    const timeout = setTimeout(() => {
      reject(new Error("Google authentication was cancelled or timed out"));
    }, 60000); // 60 second timeout

    initializeGoogleAuth(clientId)
      .then((googleAccounts) => {
        let isResolved = false;

        // Initialize the ID token client
        googleAccounts.id.initialize({
          client_id: clientId,
          callback: (response: any) => {
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
          },
        });

        // Handle cancellation/dismissal for One Tap
        googleAccounts.id.cancel = () => {
          if (!isResolved) {
            clearTimeout(timeout);
            isResolved = true;
            reject(new Error("Google authentication was cancelled"));
          }
        };

        // Create a temporary button to trigger the popup
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        document.body.appendChild(tempContainer);

        // Render the sign-in button
        googleAccounts.id.renderButton(tempContainer, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          shape: 'rectangular',
          text: 'signin_with',
          logo_alignment: 'left',
          width: 250,
        });

        // Find and click the button
        setTimeout(() => {
          const button = tempContainer.querySelector('[role="button"]') as HTMLElement;
          if (button) {
            button.click();
          } else {
            // Fallback to One Tap
            googleAccounts.id.prompt((notification: any) => {
              // Handle One Tap dismissal
              if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
                if (!isResolved) {
                  clearTimeout(timeout);
                  isResolved = true;
                  reject(new Error("Google authentication was cancelled"));
                }
              }
            });
          }
          
          // Clean up
          setTimeout(() => {
            if (tempContainer.parentNode) {
              tempContainer.parentNode.removeChild(tempContainer);
            }
          }, 1000);
        }, 100);

        // Additional timeout check for popup closure detection
        const checkInterval = setInterval(() => {
          // Check if the popup/One Tap was closed without authentication
          if (!isResolved && !document.querySelector('[data-onload="gis_loaded"]')) {
            // This is a heuristic check - if Google's elements are removed, assume popup was closed
            clearTimeout(timeout);
            clearInterval(checkInterval);
            isResolved = true;
            reject(new Error("Google authentication popup was closed"));
          }
        }, 1000);

        // Clear interval after timeout
        setTimeout(() => {
          clearInterval(checkInterval);
        }, 60000);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
};
