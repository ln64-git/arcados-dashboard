const WebSocket = require('ws');

// Test WebSocket connection to mock SurrealDB server
const ws = new WebSocket('ws://localhost:8000/rpc');

ws.on('open', () => {
  console.log('🔹 WebSocket connection opened');
  
  // Test authentication
  const authMessage = {
    id: 'auth_test',
    method: 'signin',
    params: [{
      user: 'root',
      pass: 'root'
    }]
  };
  
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  console.log('🔹 Received message:', data.toString());
});

ws.on('error', (error) => {
  console.error('🔸 WebSocket error:', error);
});

ws.on('close', (code, reason) => {
  console.log('🔸 WebSocket closed:', code, reason.toString());
});

// Close after 5 seconds
setTimeout(() => {
  ws.close();
  process.exit(0);
}, 5000);

