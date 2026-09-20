export enum ConnectionStatus {
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
  ERROR = "error",
}

type MessageCallback = (data: any) => void;
type StatusCallback = (status: ConnectionStatus) => void;

export type MarketType = "spot" | "eco" | "futures" | "forex";

// Use a symbol key on globalThis to ensure singleton persists across HMR in Next.js
const WS_MANAGER_KEY = Symbol.for("__wsManager__");

class WebSocketManager {
  private static instance: WebSocketManager;
  private connections: Map<string, WebSocket> = new Map();
  private connectionStatus: Map<string, ConnectionStatus> = new Map();
  private connectionUrls: Map<string, string> = new Map(); // Store URLs for reconnection
  private intentionallyClosed: Set<string> = new Set(); // Track intentional closes
  private subscriptions: Map<string, Map<string, Set<MessageCallback>>> =
    new Map();
  private statusListeners: Map<string, Set<StatusCallback>> = new Map();
  private reconnectTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private messageQueues: Map<string, any[]> = new Map(); // Queue messages until connection is ready
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second delay
  private recoveryListenersInstalled = false;
  private debug = process.env.NODE_ENV !== "production"; // Enable debug in development

  // Get singleton instance - uses globalThis to survive HMR in development
  public static getInstance(): WebSocketManager {
    // Check globalThis first (survives HMR)
    if ((globalThis as any)[WS_MANAGER_KEY]) {
      return (globalThis as any)[WS_MANAGER_KEY];
    }

    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
      // Store in globalThis for HMR persistence
      (globalThis as any)[WS_MANAGER_KEY] = WebSocketManager.instance;
    }
    return WebSocketManager.instance;
  }

  // Connect to a WebSocket server
  public connect(url: string, connectionId = "default"): void {
    // If already connecting or connected, do nothing.
    // IMPORTANT: Check status FIRST to handle race conditions where multiple
    // components call connect() nearly simultaneously. The status is set to
    // CONNECTING before the WebSocket is created, preventing duplicate connections.
    //
    // RECONNECTING must NOT be part of this guard. reconnect() sets the status to
    // RECONNECTING and then calls connect() from its own backoff timer — counting
    // that as "already connecting" made the scheduled call return immediately, so
    // the socket was never recreated and the connection sat in RECONNECTING
    // forever. Nothing reschedules after that, so a single unintentional drop
    // (idle proxy timeout, brief network blip, server heartbeat closing a stale
    // socket) permanently killed the feed: orderbook/trades silently stopped
    // updating until a full page refresh.
    const currentStatus = this.connectionStatus.get(connectionId);
    if (
      currentStatus === ConnectionStatus.CONNECTED ||
      currentStatus === ConnectionStatus.CONNECTING
    ) {
      return;
    }

    // Any connect() supersedes a pending scheduled reconnect, so a timer firing
    // later can never open a second socket for this connection.
    const pendingReconnect = this.reconnectTimeouts.get(connectionId);
    if (pendingReconnect) {
      clearTimeout(pendingReconnect);
      this.reconnectTimeouts.delete(connectionId);
    }

    this.installRecoveryListeners();

    // If there's an existing connection that's closing, clean it up first
    const existingConnection = this.connections.get(connectionId);
    if (existingConnection) {
      this.abandon(existingConnection);
      this.connections.delete(connectionId);
    }

    // Clear intentionally closed flag since we're making a new connection
    this.intentionallyClosed.delete(connectionId);

    // Store the URL for potential reconnection
    this.connectionUrls.set(connectionId, url);

    /*
      THE QUEUE IS EMPTIED FOR THE NEW SOCKET, NOT CARRIED OVER TO IT.

      `sendMessage` already refuses to queue when there is NO connection, for
      exactly the right reason — a stale teardown arriving after a fresh
      SUBSCRIBE cancels it. But that guard has a hole: `reconnect()` calls this
      method, which puts a CONNECTING socket into `connections` straight away,
      and from that moment `connection` is truthy while `readyState` is not
      OPEN. Anything sent during the handshake window is therefore QUEUED — and
      the frames arriving in that window are the previous session's effect
      cleanups.

      They then flush in `handleOpen`, AFTER `notifyStatusListeners` has told
      `market-data-ws` to re-send its SUBSCRIBE frames. The queued UNSUBSCRIBE
      lands last and silently cancels the subscription the reconnect existed to
      restore.

      Execution only reaches here when a socket is actually about to be created
      (the early returns above have all passed), so emptying is safe and makes
      the queue mean one thing: messages for THIS socket.
    */
    this.messageQueues.set(connectionId, []);

    // Update connection status FIRST to prevent race conditions
    // This must happen before any async operations
    this.connectionStatus.set(connectionId, ConnectionStatus.CONNECTING);
    this.notifyStatusListeners(connectionId);

    // Create a new WebSocket connection
    // Note: WebSocket in browser automatically includes cookies for same-origin requests
    try {
      // Convert relative path to full WebSocket URL
      let resolvedUrl = url;
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const isDev = process.env.NODE_ENV === "development";
        const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || "4000";
        // In development, connect directly to backend (Next.js rewrites don't support WebSocket upgrades)
        const host = isDev ? `${window.location.hostname}:${backendPort}` : window.location.host;
        // Ensure the path has a leading slash
        const path = url.startsWith('/') ? url : `/${url}`;
        resolvedUrl = `${protocol}//${host}${path}`;
      }

      // The browser automatically sends the httpOnly auth cookie with the
      // same-origin WebSocket handshake, so no token needs to be in the URL.
      const ws = new WebSocket(resolvedUrl);

      /*
        EVERY HANDLER IS GUARDED BY `isCurrent(ws)`, AND THAT IS NOT DEFENSIVE
        PROGRAMMING — IT IS THE FIX FOR A SOCKET THAT OUTLIVES ITS OWN SLOT.
        ─────────────────────────────────────────────────────────────────────
        A socket's events are ASYNCHRONOUS. Closing one and immediately opening
        a replacement — which `connect()` does above, which `close()` does, and
        which React does on every remount — leaves the OLD socket's `error` and
        `close` still queued. Handlers keyed only by `connectionId` then run
        those events against the NEW socket's bookkeeping:

          · `handleError` checks `intentionallyClosed`, but the replacing
            `connect()` has already deleted that flag, so the abandoned socket's
            error is reported as a live failure. That is the
            "WebSocket \"dex-terminal-swaps\" could not connect … Retrying."
            warning on a terminal whose socket was fine — React's StrictMode
            double-invokes effects in development, so the swap terminal logged
            it on EVERY load.

          · `handleClose` is worse and is not development-only. It deletes
            `connections[connectionId]` — the entry now holding the LIVE socket
            — marks the connection DISCONNECTED and schedules a reconnect. The
            manager loses its handle on a working socket, opens a second one,
            and nothing ever closes the first.

        Comparing identity is the whole guard: an event from a socket this id no
        longer owns is not this connection's news.
      */
      const isCurrent = () => this.connections.get(connectionId) === ws;

      ws.onopen = () => {
        if (isCurrent()) this.handleOpen(connectionId);
      };
      ws.onmessage = (event) => {
        if (isCurrent()) this.handleMessage(event, connectionId);
      };
      ws.onclose = () => {
        if (isCurrent()) this.handleClose(connectionId, url);
      };
      ws.onerror = (error) => {
        if (isCurrent()) this.handleError(error, connectionId);
      };

      // Store the connection
      this.connections.set(connectionId, ws);
    } catch (error) {
      /*
        `new WebSocket()` THROWS for a malformed or mixed-content URL, and this
        branch used to set ERROR and stop there — without notifying anybody and
        without scheduling a retry.

        Line 102 above has already set CONNECTING and told every listener about
        it, so each consumer's mirrored status stayed on "Connecting" forever:
        the panels showed a spinner, no reconnect was ever attempted, and the
        one signal that something was wrong went to `console.error` where no UI
        can see it. Both halves are needed — say so, then try again.
      */
      console.error(
        `Error creating WebSocket connection for ${connectionId}:`,
        error
      );
      this.connections.delete(connectionId);
      this.connectionStatus.set(connectionId, ConnectionStatus.ERROR);
      this.notifyStatusListeners(connectionId);
      this.handleError(new Event("error"), connectionId);
      // Backs off and gives up after `maxReconnectAttempts`, so a permanently
      // bad URL cannot spin.
      this.reconnect(connectionId, url);
    }
  }

  /**
   * Stop listening to a socket, then close it.
   *
   * DETACH BEFORE CLOSE, ALWAYS, AND IN THAT ORDER. `close()` on a socket still
   * in CONNECTING makes the browser fire `error` ("WebSocket is closed before
   * the connection is established") and then `close` — for a socket we have
   * already decided to discard. Nulling the handlers first means those events
   * reach nothing at all, so they cannot be mistaken for the current
   * connection's news even for the instant before `connections` is reassigned.
   *
   * The `isCurrent` guard in `connect()` is the load-bearing half and would
   * cover this on its own; this is what stops the browser doing the work and,
   * in development, what stops the console line being printed by the runtime
   * itself.
   */
  private abandon(socket: WebSocket): void {
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;

    /*
      A SOCKET STILL SHAKING HANDS IS CLOSED WHEN IT OPENS, NOT NOW.

      `close()` during CONNECTING aborts the handshake, and the browser RUNTIME
      logs that itself:

        WebSocket connection to 'ws://…' failed:
        WebSocket is closed before the connection is established.

      Nothing in this file can suppress that line — it is Chromium's, not ours —
      so the only way to stop printing it is to not abort a handshake. Waiting
      one round trip and closing cleanly costs nothing: the socket is discarded
      either way, and its message/close/error handlers are already detached
      above, so anything it does in between reaches nothing.

      This is not a rare path. React StrictMode double-invokes effects in
      development — mount, unmount, mount — so every load of the swap terminal
      tore down its socket mid-handshake and printed the line, on a connection
      that was working.

      If the handshake FAILS instead of opening, `onopen` never fires and the
      socket dies on its own with no handler attached. Nothing leaks.
    */
    if (socket.readyState === WebSocket.CONNECTING) {
      socket.onopen = () => socket.close();
      return;
    }

    socket.onopen = null;
    if (socket.readyState === WebSocket.OPEN) socket.close();
  }

  // Handle WebSocket open event
  private handleOpen(connectionId: string): void {
    this.connectionStatus.set(connectionId, ConnectionStatus.CONNECTED);
    this.reconnectAttempts.set(connectionId, 0); // Reset reconnect attempts

    /*
      THE QUEUE DRAINS BEFORE THE LISTENERS ARE TOLD, AND THE ORDER IS THE FIX.

      It used to be the other way round, and that is what let a stale teardown
      cancel a live subscription. `notifyStatusListeners` is what makes
      `market-data-ws` re-send its SUBSCRIBE frames on a reconnect, and those go
      out immediately because the socket is now OPEN. Draining afterwards put
      whatever had been queued during the handshake — effect cleanups from the
      session that just ended — AFTER them, so the last word on a freshly
      reconnected socket was an UNSUBSCRIBE for something that had just been
      re-subscribed. The panel reconnected, reported itself connected, and
      received nothing.

      Draining first means the old session's frames are spent before the new
      session speaks, which is the only ordering in which both can be correct.
    */
    this.processMessageQueue(connectionId);

    this.notifyStatusListeners(connectionId);
  }

  /**
   * Flush the queue, STOPPING at the first message that will not go.
   *
   * The old loop shifted every message and ignored the result, so a socket that
   * died one message into the flush discarded the entire remainder — including
   * the SUBSCRIBE that a reconnect exists to re-send. Putting the failed message
   * back and stopping leaves the queue in a state the NEXT open can finish, and
   * preserves order, which matters when a SUBSCRIBE is followed by anything.
   */
  private processMessageQueue(connectionId: string): void {
    const queue = this.messageQueues.get(connectionId);
    if (!queue || queue.length === 0) return;

    while (queue.length > 0) {
      const message = queue[0];
      if (!this.sendMessageImmediate(message, connectionId)) return;
      queue.shift();
    }
  }

  // Handle WebSocket message event
  private handleMessage(event: MessageEvent, connectionId: string): void {
    try {
      const data = JSON.parse(event.data);
      // Handle different message formats
      let streamKey = data.stream || "default";

      // Support ticket frames are routed to a per-ticket stream key.
      //
      // This was an explicit allowlist — `method === "reply"` or
      // `method === "update"` — so ANY frame type added later reached nobody,
      // silently, with a clean log on both ends. The AI support addon adds
      // `ai.status` / `ai.delta` / `ai.done` / `ai.cancelled` / `ai.handover`,
      // and every one of them would have been dropped here.
      //
      // Route on what actually identifies the channel: a `payload.id`.
      const isTicketFrame = Boolean(data.payload?.id);
      if (isTicketFrame) {
        streamKey = `ticket-${data.payload.id}`;
      }

      // Notify subscribers
      if (this.subscriptions.has(connectionId)) {
        const connectionSubscriptions = this.subscriptions.get(connectionId)!;
        if (connectionSubscriptions.has(streamKey)) {
          const callbacks = connectionSubscriptions.get(streamKey)!;
          // Support frames are delivered whole (`{method, payload}`) — the
          // three support surfaces switch on `method`. Every other channel
          // keeps the historical unwrapping; market/ticker/order streams send
          // `{stream, data}` and their consumers expect the inner value.
          const delivered = isTicketFrame ? data : data.data || data;

          /*
            A FRAME THAT NAMED ITS SYMBOL MUST NOT LOSE IT IN THE UNWRAP.

            The unwrap above hands consumers the inner value. For `orderbook`
            and `ticker` that value is an OBJECT carrying its own `symbol`, so
            the consumer can check it. For `ohlcv` it is an array of
            `[time, o, h, l, c, v]` tuples with nowhere to put one — and the
            client's stream key for ohlcv is `ohlcv:<interval>` with no symbol
            in it either, so every ohlcv subscriber on a connection shares one
            callback Set and there was nothing at all to filter on. A frame for
            another market at the same interval was delivered to, and drawn by,
            whichever chart was open.

            Copying the envelope's `symbol` onto the array is the smallest
            repair: `Array.isArray`, `.length` and index access are unchanged,
            so nothing that iterates it can notice, and the one consumer that
            needs to know whose bars these are can now ask.
          */
          if (
            !isTicketFrame &&
            data.symbol &&
            Array.isArray(delivered) &&
            (delivered as any).symbol === undefined
          ) {
            (delivered as any).symbol = data.symbol;
          }
          callbacks.forEach((callback) => {
            try {
              callback(delivered);
            } catch (error) {
              console.error(`Error in callback for ${streamKey}:`, error);
            }
          });
        }
      }
    } catch (error) {
      console.error(
        `Error parsing WebSocket message for ${connectionId}:`,
        error
      );
    }
  }

  // Handle WebSocket close event
  private handleClose(connectionId: string, url: string): void {
    // Check if this was an intentional close
    const wasIntentionallyClosed = this.intentionallyClosed.has(connectionId);

    this.connections.delete(connectionId);
    /* Whatever was still queued was addressed to the socket that just died. It
       is not news for its replacement — see the note in `connect()`. */
    this.messageQueues.set(connectionId, []);

    // Only update status and reconnect if this wasn't an intentional close
    if (!wasIntentionallyClosed) {
      this.connectionStatus.set(connectionId, ConnectionStatus.DISCONNECTED);
      this.notifyStatusListeners(connectionId);

      // Attempt to reconnect only for unintentional disconnections
      this.reconnect(connectionId, url);
    }
  }

  // Handle WebSocket error event
  //
  // The event itself is deliberately empty — the WebSocket spec forbids
  // exposing why a connection failed — so logging it prints "[object Event]"
  // and tells nobody anything. What is diagnosable is our own state, and the
  // close event that always follows carries the code. So report the connection
  // and let the reconnect path narrate the rest.
  private handleError(_error: Event, connectionId: string): void {
    // A hidden tab or a torn-down page is not a fault the operator can act on,
    // and a repeated failure would otherwise log once per retry.
    const attempts = this.reconnectAttempts.get(connectionId) || 0;
    const visible =
      typeof document === "undefined" || document.visibilityState === "visible";
    if (!visible || attempts > 0 || this.intentionallyClosed.has(connectionId)) {
      return;
    }

    console.warn(
      `WebSocket "${connectionId}" could not connect (${
        this.connectionUrls.get(connectionId) || "unknown url"
      }). Retrying.`
    );
  }

  // Retry dead connections when the network or the tab comes back.
  //
  // A passive observer never remounts a component, so nothing else would ever
  // trigger a reconnect for them. Two cases the backoff chain alone cannot cover:
  // a socket that died while the tab was backgrounded (timers are throttled, so
  // the chain can exhaust its 5 attempts while offline) and one that exhausted
  // its attempts during an outage. Both heal on the next online/visible event
  // instead of requiring a page refresh.
  private installRecoveryListeners(): void {
    if (this.recoveryListenersInstalled || typeof window === "undefined") return;
    this.recoveryListenersInstalled = true;

    const retryDeadConnections = () => {
      this.connectionUrls.forEach((url, connectionId) => {
        if (this.intentionallyClosed.has(connectionId)) return;
        const status = this.connectionStatus.get(connectionId);
        if (
          status === ConnectionStatus.CONNECTED ||
          status === ConnectionStatus.CONNECTING
        ) {
          return;
        }
        // Fresh user-visible trigger, not a continuation of the old backoff
        // chain — reset the budget so a previous give-up isn't permanent.
        this.reconnectAttempts.set(connectionId, 0);
        this.connect(url, connectionId);
      });
    };

    window.addEventListener("online", retryDeadConnections);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") retryDeadConnections();
    });
  }

  // Attempt to reconnect to the WebSocket server
  private reconnect(connectionId: string, url: string): void {
    // Clear any existing reconnect timeout
    if (this.reconnectTimeouts.has(connectionId)) {
      clearTimeout(this.reconnectTimeouts.get(connectionId)!);
    }

    // Get current reconnect attempts
    const attempts = this.reconnectAttempts.get(connectionId) || 0;

    // Check if we've exceeded the maximum number of reconnect attempts
    if (attempts >= this.maxReconnectAttempts) {
      console.warn(
        `WebSocket "${connectionId}" gave up after ${this.maxReconnectAttempts} attempts. Live updates have stopped; they resume when the tab regains focus or the network returns.`
      );
      // Surface the give-up as ERROR instead of leaving the status stuck at
      // RECONNECTING. Consumers (market-data-ws) key off ERROR to drop their
      // "already connected" bookkeeping, which is what allows a later
      // ensureConnection() — or the online/visibility recovery below — to start a
      // genuinely fresh connection instead of silently no-oping forever.
      this.connectionStatus.set(connectionId, ConnectionStatus.ERROR);
      this.notifyStatusListeners(connectionId);
      return;
    }

    // Update connection status
    this.connectionStatus.set(connectionId, ConnectionStatus.RECONNECTING);
    this.notifyStatusListeners(connectionId);

    // Calculate exponential backoff delay
    const delay = Math.min(this.reconnectDelay * Math.pow(2, attempts), 30000); // Max 30 seconds

    // Set a timeout to reconnect
    const timeout = setTimeout(() => {
      this.reconnectAttempts.set(connectionId, attempts + 1);
      this.connect(url, connectionId);
    }, delay);

    // Store the timeout
    this.reconnectTimeouts.set(connectionId, timeout);
  }

  // Subscribe to a WebSocket stream
  public subscribe(
    streamKey: string,
    callback: MessageCallback,
    connectionId = "default"
  ): void {
    // Initialize subscriptions map for this connection if it doesn't exist
    if (!this.subscriptions.has(connectionId)) {
      this.subscriptions.set(connectionId, new Map());
    }

    // Initialize callbacks set for this stream if it doesn't exist
    const connectionSubscriptions = this.subscriptions.get(connectionId)!;
    if (!connectionSubscriptions.has(streamKey)) {
      connectionSubscriptions.set(streamKey, new Set());
    }

    // Add the callback to the set
    connectionSubscriptions.get(streamKey)!.add(callback);
  }

  // Unsubscribe from a WebSocket stream
  public unsubscribe(
    streamKey: string,
    callback: MessageCallback,
    connectionId = "default"
  ): void {
    if (this.subscriptions.has(connectionId)) {
      const connectionSubscriptions = this.subscriptions.get(connectionId)!;
      if (connectionSubscriptions.has(streamKey)) {
        const callbacks = connectionSubscriptions.get(streamKey)!;
        callbacks.delete(callback);

        // If no more callbacks, remove the stream
        if (callbacks.size === 0) {
          connectionSubscriptions.delete(streamKey);
        }
      }
    }
  }

  /**
   * Send a message, queueing it until the socket can carry it.
   *
   * ───────────────────────────────────────────────────────────────────────────
   * THIS USED TO GATE ON `connectionStatus` AND THEN SEND ON `readyState`, AND
   * WHEN THE TWO DISAGREED THE MESSAGE WAS LOGGED AND DROPPED.
   *
   * `connectionStatus` is our own mirror, updated in `handleOpen`/`handleClose`.
   * `readyState` is the browser's. They are not the same clock: a socket the
   * server has just dropped is CLOSING or CLOSED for several milliseconds before
   * `onclose` runs and our mirror catches up. In that window `sendMessage` took
   * the "connection is ready" branch, `sendMessageImmediate` found it shut, and
   * the message went to `console.error` — the branch that exists to QUEUE was
   * skipped precisely when queueing was the right answer.
   *
   * What that cost is worse than a console line. The DEX terminal's SUBSCRIBE
   * goes through here, and its own comment says a missing one "silently kills
   * live updates for the rest of the session" — a swap panel that never moves
   * again, with one error in the console as the only trace.
   *
   * `readyState` IS NOW THE ONLY THING CONSULTED, because it is the value the
   * send itself is governed by. One source of truth cannot disagree with itself.
   * ───────────────────────────────────────────────────────────────────────────
   */
  public sendMessage(message: any, connectionId = "default"): void {
    const connection = this.connections.get(connectionId);

    if (connection?.readyState === WebSocket.OPEN) {
      if (this.sendMessageImmediate(message, connectionId)) return;
      // The socket shut between the check and the send. Fall through and queue.
    }

    /*
      NO CONNECTION AT ALL MEANS DROP, NOT QUEUE, and the distinction is
      load-bearing rather than tidiness.

      Almost every message that arrives here with no connection is an UNSUBSCRIBE
      from an effect cleanup running after `close()` — there is nothing left to
      unsubscribe from. Queueing it would hold it until the NEXT connection under
      this id opens, and it would then arrive right after that session's
      SUBSCRIBE and cancel it. A stale teardown message silently unsubscribing a
      fresh session is a worse failure than the one this method was fixed for.
    */
    if (!connection) return;

    if (!this.messageQueues.has(connectionId)) {
      this.messageQueues.set(connectionId, []);
    }
    this.messageQueues.get(connectionId)!.push(message);
  }

  /**
   * Write to the socket. Returns false when it could not be written.
   *
   * A BOOLEAN RATHER THAN A LOG. Logging was the whole bug: it turned "this
   * needs to be retried" into "this has been reported", and the caller carried
   * on as though the message had been sent.
   */
  private sendMessageImmediate(message: any, connectionId: string): boolean {
    const connection = this.connections.get(connectionId);
    if (!connection || connection.readyState !== WebSocket.OPEN) return false;

    try {
      connection.send(JSON.stringify(message));
      return true;
    } catch {
      /*
        `send()` THROWS on a socket that closed between the readyState check and
        this line — a real race, not a hypothetical, because closing is driven by
        the network rather than by us. Reported as "not sent" so the caller
        queues it, which is what the retry path is for.
      */
      return false;
    }
  }

  // Add a status listener
  public addStatusListener(
    callback: StatusCallback,
    connectionId = "default"
  ): void {
    // Initialize status listeners set for this connection if it doesn't exist
    if (!this.statusListeners.has(connectionId)) {
      this.statusListeners.set(connectionId, new Set());
    }

    // Add the callback to the set
    this.statusListeners.get(connectionId)!.add(callback);

    // Notify the listener of the current status
    const status =
      this.connectionStatus.get(connectionId) || ConnectionStatus.DISCONNECTED;
    callback(status);
  }

  // Remove a status listener
  public removeStatusListener(
    callback: StatusCallback,
    connectionId = "default"
  ): void {
    if (this.statusListeners.has(connectionId)) {
      this.statusListeners.get(connectionId)!.delete(callback);
    }
  }

  // Notify all status listeners of a status change
  private notifyStatusListeners(connectionId: string): void {
    const status =
      this.connectionStatus.get(connectionId) || ConnectionStatus.DISCONNECTED;
    if (this.statusListeners.has(connectionId)) {
      this.statusListeners.get(connectionId)!.forEach((callback) => {
        try {
          callback(status);
        } catch (error) {
          console.error(`Error in status listener for ${connectionId}:`, error);
        }
      });
    }
  }

  // Get the current connection status
  public getStatus(connectionId = "default"): ConnectionStatus {
    return (
      this.connectionStatus.get(connectionId) || ConnectionStatus.DISCONNECTED
    );
  }

  // Close a WebSocket connection
  public close(connectionId = "default"): void {
    // Mark as intentionally closed FIRST to prevent reconnection attempts
    this.intentionallyClosed.add(connectionId);

    // Clear any reconnect timeouts for this connection
    const timeout = this.reconnectTimeouts.get(connectionId);
    if (timeout) {
      clearTimeout(timeout);
      this.reconnectTimeouts.delete(connectionId);
    }

    const connection = this.connections.get(connectionId);
    if (connection) {
      this.abandon(connection);
      this.connections.delete(connectionId);
    }

    // Always update status and clean up data regardless of connection state
    this.connectionStatus.set(connectionId, ConnectionStatus.DISCONNECTED);
    this.notifyStatusListeners(connectionId);

    // Clear associated data
    this.subscriptions.delete(connectionId);
    this.messageQueues.delete(connectionId);
    this.reconnectAttempts.delete(connectionId);
    this.connectionUrls.delete(connectionId);
  }

  // Close all WebSocket connections
  public closeAll(): void {
    this.connections.forEach((connection, connectionId) => {
      this.close(connectionId);
    });
  }
}

// Export singleton instance
export const wsManager = WebSocketManager.getInstance();
