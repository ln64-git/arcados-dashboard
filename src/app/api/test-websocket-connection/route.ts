import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function GET() {
	try {
		console.log("🔹 Testing WebSocket connection...");

		const client = new SurrealWebSocketClient();
		console.log("🔹 WebSocket client created");

		await client.connect();
		console.log("🔹 WebSocket client connected");

		// Test a simple live query
		const liveQueryId = await client.live(
			"SELECT * FROM channels WHERE guildId = $guildId",
			{ guildId: "test-guild" },
		);
		console.log("🔹 Live query created:", liveQueryId);

		// Set up callback
		client.onLiveQuery(liveQueryId, (event) => {
			console.log("🔹 Live query event received:", event);
		});

		await client.close();
		console.log("🔹 WebSocket client closed");

		return new Response(
			JSON.stringify({
				success: true,
				liveQueryId,
				message: "WebSocket connection test successful",
			}),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	} catch (error) {
		console.error("🔸 WebSocket connection test failed:", error);
		return new Response(
			JSON.stringify({
				success: false,
				error: error instanceof Error ? error.message : String(error),
				message: "WebSocket connection test failed",
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

