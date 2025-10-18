// Test the SurrealWebSocketClient with the mock server
const { SurrealWebSocketClient } = require('./src/lib/surreal/SurrealWebSocketClient.ts');

async function testWebSocketClient() {
  try {
    console.log('🔹 Testing SurrealWebSocketClient...');
    
    // Set environment variables
    process.env.SURREAL_URL = 'ws://localhost:8000/rpc';
    process.env.SURREAL_USERNAME = 'root';
    process.env.SURREAL_PASSWORD = 'root';
    
    const client = new SurrealWebSocketClient();
    await client.connect();
    
    console.log('🔹 Connected successfully!');
    
    // Test a live query
    const liveQueryId = await client.live('SELECT * FROM channels WHERE guildId = $guildId', { guildId: 'test-guild' });
    console.log('🔹 Live query created:', liveQueryId);
    
    // Set up callback
    client.onLiveQuery(liveQueryId, (event) => {
      console.log('🔹 Live query event:', event);
    });
    
    // Wait for events
    setTimeout(async () => {
      await client.kill(liveQueryId);
      await client.close();
      console.log('🔹 Test completed');
      process.exit(0);
    }, 5000);
    
  } catch (error) {
    console.error('🔸 Error testing WebSocket client:', error);
    process.exit(1);
  }
}

testWebSocketClient();

