import { NextRequest, NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function GET() {
	try {
		console.log("🔹 Testing live query functionality...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		// Create a live query for voice states
		const liveQueryId = await client.live("SELECT * FROM voice_states");
		console.log("🔹 Live query created with ID:", liveQueryId);

		// Set up callback to handle live updates
		client.onLiveQuery(liveQueryId, (data) => {
			console.log("🔹 Live query update received:", data);
		});

		// Insert some test data to trigger the live query
		console.log("🔹 Inserting test voice state...");
		await client.query(`
			CREATE voice_states:test_state SET
				id = "guild_123_user_456",
				guild_id = "guild_123",
				user_id = "user_456",
				channel_id = "channel_789",
				self_mute = false,
				self_deaf = false,
				server_mute = false,
				server_deaf = false,
				streaming = false,
				self_video = false,
				suppress = false,
				session_id = "session_001",
				joined_at = time::now(),
				created_at = time::now(),
				updated_at = time::now()
		`);

		// Wait a moment for the live query to trigger
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Update the voice state to trigger another live query event
		console.log("🔹 Updating test voice state...");
		await client.query(`
			UPDATE voice_states:test_state SET
				self_mute = true,
				updated_at = time::now()
		`);

		// Wait for the update to trigger
		await new Promise((resolve) => setTimeout(resolve, 1000));

		// Clean up
		await client.kill(liveQueryId);
		await client.close();

		return NextResponse.json({
			success: true,
			message: "Live query test completed successfully",
			liveQueryId: liveQueryId,
		});
	} catch (error) {
		console.error("🔸 Live query test failed:", error);

		return NextResponse.json(
			{
				success: false,
				error: error.message,
				fullError: error.toString(),
			},
			{ status: 500 },
		);
	}
}
