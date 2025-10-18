const { WebSocketServer } = require("ws");
const { createServer } = require("http");

// Mock SurrealDB WebSocket server for testing
class MockSurrealDBServer {
	constructor(port = 8000) {
		this.port = port;
		this.liveQueries = new Map();
		this.clients = new Set();
		this.setupHttpServer();
		this.setupWebSocketServer();
	}

	setupHttpServer() {
		this.httpServer = createServer((req, res) => {
			// Handle HTTP requests (for testing HTTP client)
			if (req.url === "/sql" && req.method === "POST") {
				let body = "";
				req.on("data", (chunk) => {
					body += chunk.toString();
				});
				req.on("end", () => {
					try {
						const { query, params } = JSON.parse(body);
						console.log("🔹 Mock SurrealDB HTTP query:", query, params);

						// Mock response based on query
						const response = this.handleHttpQuery(query, params);
						res.writeHead(200, {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": "*",
						});
						res.end(JSON.stringify(response));
					} catch (error) {
						res.writeHead(400, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ error: "Invalid request" }));
					}
				});
			} else {
				res.writeHead(404, { "Content-Type": "text/plain" });
				res.end("Not found");
			}
		});
	}

	setupWebSocketServer() {
		this.wss = new WebSocketServer({
			server: this.httpServer,
			path: "/rpc",
		});

		this.wss.on("connection", (ws) => {
			console.log("🔹 Mock SurrealDB WebSocket client connected");
			this.clients.add(ws);

			ws.on("message", (data) => {
				try {
					const message = JSON.parse(data.toString());
					console.log("🔹 Mock SurrealDB received:", message);
					this.handleWebSocketMessage(ws, message);
				} catch (error) {
					console.error("🔸 Error parsing WebSocket message:", error);
				}
			});

			ws.on("close", () => {
				console.log("🔸 Mock SurrealDB WebSocket client disconnected");
				this.clients.delete(ws);
			});

			ws.on("error", (error) => {
				console.error("🔸 Mock SurrealDB WebSocket error:", error);
				this.clients.delete(ws);
			});
		});
	}

	handleHttpQuery(query, params) {
		// Mock responses for common queries
		if (query.includes("USE NAMESPACE") || query.includes("USE DATABASE")) {
			return [{ result: null, status: "OK", time: "0ms" }];
		}

		if (query.includes("SELECT * FROM channels")) {
			return [
				{
					result: [
						{
							id: "channel:1",
							discordId: "123456789",
							channelName: "General",
							guildId: params.guildId || "1254694808228986912",
							position: 0,
							memberCount: 5,
							isActive: true,
							status: "Active",
						},
						{
							id: "channel:2",
							discordId: "987654321",
							channelName: "Gaming",
							guildId: params.guildId || "1254694808228986912",
							position: 1,
							memberCount: 3,
							isActive: true,
							status: "Active",
						},
					],
					status: "OK",
					time: "1ms",
				},
			];
		}

		if (query.includes("SELECT * FROM voice_sessions")) {
			return [
				{
					result: [
						{
							id: "session:1",
							userId: "user:123",
							channelId: params.channelId || "123456789",
							username: "TestUser",
							displayName: "Test User",
							avatar: null,
							discriminator: "0001",
							joinedAt: new Date().toISOString(),
							isActive: true,
						},
					],
					status: "OK",
					time: "1ms",
				},
			];
		}

		if (query.includes("SELECT * FROM users")) {
			return [
				{
					result: [
						{
							id: "user:123",
							username: "TestUser",
							displayName: "Test User",
							avatar: null,
							discriminator: "0001",
							guildId: params.guildId || "1254694808228986912",
						},
					],
					status: "OK",
					time: "1ms",
				},
			];
		}

		if (query.includes("SELECT * FROM messages")) {
			return [
				{
					result: [
						{
							id: "message:1",
							channelId: params.channelId || "123456789",
							userId: "user:123",
							content: "Hello world!",
							timestamp: new Date().toISOString(),
						},
					],
					status: "OK",
					time: "1ms",
				},
			];
		}

		// Default response
		return [{ result: [], status: "OK", time: "0ms" }];
	}

	handleWebSocketMessage(ws, message) {
		const { id, method, params } = message;

		switch (method) {
			case "use":
				// Handle namespace/database selection
				ws.send(
					JSON.stringify({
						id,
						result: null,
					}),
				);
				break;

			case "authenticate":
			case "signin":
				// Handle authentication
				ws.send(
					JSON.stringify({
						id,
						result: "mock-token",
					}),
				);
				break;

			case "live": {
				// Handle live query subscription
				const [query, queryParams] = params;
				const liveQueryId = `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

				this.liveQueries.set(liveQueryId, {
					query,
					params: queryParams,
					client: ws,
				});

				ws.send(
					JSON.stringify({
						id,
						result: liveQueryId,
					}),
				);

				// Send initial data
				this.sendLiveQueryUpdate(
					liveQueryId,
					"CREATE",
					this.handleHttpQuery(query, queryParams)[0].result[0],
				);
				break;
			}

			case "kill": {
				// Handle live query termination
				const [queryId] = params;
				this.liveQueries.delete(queryId);
				ws.send(
					JSON.stringify({
						id,
						result: null,
					}),
				);
				break;
			}

			default:
				ws.send(
					JSON.stringify({
						id,
						result: null,
					}),
				);
		}
	}

	sendLiveQueryUpdate(liveQueryId, action, data) {
		const subscription = this.liveQueries.get(liveQueryId);
		console.log(
			"🔹 sendLiveQueryUpdate:",
			liveQueryId,
			"subscription exists:",
			!!subscription,
			"client ready:",
			subscription?.client?.readyState,
		);
		if (subscription && subscription.client.readyState === 1) {
			const message = {
				method: "notify",
				params: [liveQueryId, { action, result: data }],
			};
			console.log(
				"🔹 Sending live query notification:",
				JSON.stringify(message, null, 2),
			);
			subscription.client.send(JSON.stringify(message));
		}
	}

	// Simulate data changes for testing
	simulateChannelUpdate(action, data) {
		console.log(
			"🔹 Simulating channel update for",
			this.liveQueries.size,
			"live queries",
		);
		for (const [liveQueryId, subscription] of this.liveQueries.entries()) {
			console.log("🔹 Checking live query:", liveQueryId, subscription.query);
			// Ensure the update matches the query's parameters if any
			const matchesGuildId = subscription.params?.guildId === data.guildId;
			if (subscription.query.includes("channels") && matchesGuildId) {
				console.log("🔹 Sending channel update to live query:", liveQueryId);
				this.sendLiveQueryUpdate(liveQueryId, action, data);
			}
		}
	}

	simulateVoiceSessionUpdate(action, data) {
		console.log(
			"🔹 Simulating voice session update for",
			this.liveQueries.size,
			"live queries",
		);
		for (const [liveQueryId, subscription] of this.liveQueries.entries()) {
			console.log("🔹 Checking live query:", liveQueryId, subscription.query);
			const matchesChannelId = !subscription.params?.channelId || subscription.params.channelId === data.channelId;
			if (subscription.query.includes("voice_sessions") && matchesChannelId) {
				console.log("🔹 Sending voice session update to live query:", liveQueryId);
				this.sendLiveQueryUpdate(liveQueryId, action, data);
			}
		}
	}

	start() {
		return new Promise((resolve) => {
			this.httpServer.listen(this.port, () => {
				console.log(`🔹 Mock SurrealDB server running on port ${this.port}`);
				console.log(`🔹 HTTP endpoint: http://localhost:${this.port}/sql`);
				console.log(`🔹 WebSocket endpoint: ws://localhost:${this.port}/rpc`);
				resolve();
			});
		});
	}

	stop() {
		return new Promise((resolve) => {
			this.wss.close(() => {
				this.httpServer.close(() => {
					console.log("🔹 Mock SurrealDB server stopped");
					resolve();
				});
			});
		});
	}
}

// Start the mock server if this file is run directly
if (require.main === module) {
	const mockServer = new MockSurrealDBServer();
	mockServer.start().then(() => {
		console.log("🔹 Mock SurrealDB server is ready for testing");

		// Simulate some data changes every 5 seconds for testing
		setInterval(() => {
			console.log("🔹 Simulating channel update...");
			mockServer.simulateChannelUpdate("UPDATE", {
				id: "channel:1",
				discordId: "123456789",
				channelName: "General",
				guildId: "test-guild", // Matching guildId from SSE request
				position: 0,
				memberCount: Math.floor(Math.random() * 10) + 1,
				isActive: true,
				status: "Active",
			});
		}, 5000);

		setInterval(() => {
			console.log("🔹 Simulating voice session update...");
			mockServer.simulateVoiceSessionUpdate("CREATE", {
				id: `session:${Date.now()}`,
				userId: "user:123",
				channelId: "test-channel", // Matching channelId from SSE request
				username: "TestUser",
				displayName: "Test User",
				avatar: null,
				discriminator: "0001",
				joinedAt: new Date().toISOString(),
				isActive: true,
			});
		}, 8000);
	});
}

module.exports = { MockSurrealDBServer };
