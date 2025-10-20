import { NextRequest, NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function GET() {
	try {
		console.log("🔹 Testing direct query...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		// Test a simple SELECT query
		const result = await client.query("SELECT * FROM voice_states");
		console.log("🔹 Query result:", result);

		// Test inserting some data
		console.log("🔹 Inserting test data...");
		await client.query(`
			CREATE voice_states:test_123 SET
				id = "test_123",
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
				created_at = time::now(),
				updated_at = time::now()
		`);

		// Query again to see the data
		const result2 = await client.query("SELECT * FROM voice_states");
		console.log("🔹 Query result after insert:", result2);

		await client.close();

		return NextResponse.json({
			success: true,
			message: "Direct query test completed",
			initialResult: result,
			afterInsertResult: result2,
		});
	} catch (error) {
		console.error("🔸 Direct query test failed:", error);

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
