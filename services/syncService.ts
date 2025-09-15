/**
 * This service is responsible for synchronizing database changes between clients.
 * This version uses WebSockets to connect to a central server, enabling
 * multi-device sync over a local network.
 */

let ws: WebSocket | null = null;
let listeners: ((event: MessageEvent) => void)[] = [];
let serverUrl = '';
let onStatusChangeCallback: (status: 'disconnected' | 'connecting' | 'connected') => void = () => {};

const connect = () => {
    // Prevent multiple connection attempts
    if (!serverUrl || ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) {
        return;
    }

    console.log(`SyncService: Connecting to ${serverUrl}...`);
    onStatusChangeCallback('connecting');
    
    try {
        ws = new WebSocket(serverUrl);
    } catch (error) {
        console.error("SyncService: Failed to create WebSocket", error);
        onStatusChangeCallback('disconnected');
        return;
    }


    ws.onopen = () => {
        console.log('SyncService: Connected to WebSocket server.');
        onStatusChangeCallback('connected');
    };

    ws.onmessage = (event) => {
        console.log('SyncService: Message received from server', event.data);
        // Notify all registered listeners on this client
        listeners.forEach(callback => callback(event));
    };

    ws.onclose = () => {
        console.log('SyncService: WebSocket connection closed. Reconnecting in 3 seconds...');
        ws = null;
        onStatusChangeCallback('disconnected');
        // Simple reconnection logic
        setTimeout(connect, 3000);
    };

    ws.onerror = (error) => {
        console.error('SyncService: WebSocket error:', error);
        onStatusChangeCallback('disconnected');
        // The 'onclose' event will be triggered automatically after an error,
        // so the reconnection logic will kick in.
        ws?.close();
    };
};

/**
 * Initializes the WebSocket connection.
 * @param url The URL of the WebSocket server (e.g., "ws://192.168.1.100:8080").
 * @param onStatusChange A callback to report connection status changes to the UI.
 */
export const initialize = (url: string, onStatusChange: (status: 'disconnected' | 'connecting' | 'connected') => void) => {
    onStatusChangeCallback = onStatusChange;
    
    if (url && url !== serverUrl) {
        serverUrl = url;
        if (ws) {
            ws.close(); // Close existing connection if URL changes
        }
        connect();
    } else if (!url) {
        // If the URL is cleared, disconnect gracefully.
        if (ws) {
            ws.onclose = null; // Prevent reconnection
            ws.close();
            ws = null;
        }
        serverUrl = '';
        onStatusChange('disconnected');
    }
};


/**
 * Notifies other clients that data has changed in a specific table by sending a message to the server.
 * @param table The name of the table that was modified.
 */
export const notify = (table: string) => {
    const currentWs = ws;
    if (currentWs && currentWs.readyState === WebSocket.OPEN) {
        const message = JSON.stringify({ type: 'DATA_CHANGED', payload: { table } });
        console.log(`SyncService: Notifying change in table '${table}' via WebSocket`);
        currentWs.send(message);
    } else {
        // This is expected if the sync server is not configured or offline.
        // The app will still function locally.
        console.warn('SyncService: WebSocket not connected. Notification not sent.');
    }
};

/**
 * Adds a listener to receive notifications about data changes.
 * @param callback The function to call when a notification is received.
 * @returns A function to remove the listener.
 */
export const listen = (callback: (event: MessageEvent) => void): (() => void) => {
    listeners.push(callback);
    // Return a cleanup function to remove the event listener
    return () => {
        listeners = listeners.filter(l => l !== callback);
    };
};
