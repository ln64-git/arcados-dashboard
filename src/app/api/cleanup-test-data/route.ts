import { NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function POST() {
	try {
		console.log("🔹 Cleaning up old test data from database...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		// Remove old test data that doesn't match the current Discord guild
		const guildId = "1254694808228986912";

		// Delete old test voice states (not from current guild)
		const deletedVoiceStates = await client.query(
			`DELETE voice_states WHERE guildId != $guildId OR guildId IS NONE`,
			{ guildId },
		);

		// Delete old test channels (not from current guild)
		const deletedChannels = await client.query(
			`DELETE channels WHERE guildId != $guildId OR guildId IS NONE`,
			{ guildId },
		);

		// Delete any other test data
		const deletedTestData = await client.query(
			`DELETE voice_states WHERE id CONTAINS 'test_' OR id CONTAINS 'guild_123'`,
		);

		await client.close();

		return NextResponse.json({
			success: true,
			message: "Test data cleaned up successfully",
			deletedVoiceStates: deletedVoiceStates,
			deletedChannels: deletedChannels,
			deletedTestData: deletedTestData,
		});
	} catch (error) {
		console.error("🔸 Error cleaning up test data:", error);

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
