// server/server.js
// A simple WebSocket server to broadcast messages to all connected clients.
// To run this:
// 1. Make sure you have Node.js installed.
// 2. Run `npm install ws` in your terminal in the project directory.
// 3. Run `node server/server.js`.
// 4. Find your local IP address (e.g., 192.168.1.100) and use that in the app's settings.

const WebSocket = require('ws');

// The port the server will listen on. 8080 is a common choice.
const port = 8080;
const wss = new WebSocket.Server({ port });

wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('message', message => {
        // When a message is received from a client, log it and broadcast it.
        // We need to convert the message to a string to log it properly if it's a buffer.
        const messageString = message.toString();
        console.log(`Received message => ${messageString}`);
        
        // Broadcast the message to all other connected clients.
        wss.clients.forEach(client => {
            // Check if the client is not the sender and is ready to receive messages.
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(messageString);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.on('error', (error) => {
        console.error('WebSocket error observed:', error);
    });
});

console.log(`WebSocket sync server is running on ws://<your-ip-address>:${port}`);
