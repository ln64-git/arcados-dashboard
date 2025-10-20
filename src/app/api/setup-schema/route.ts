import { NextRequest, NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function POST() {
	try {
		console.log("🔹 Setting up SurrealDB schema...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		// Create tables based on your documentation
		const schemaQueries = [
			// Guilds table
			`DEFINE TABLE guilds SCHEMAFULL;`,

			// Channels table
			`DEFINE TABLE channels SCHEMAFULL;`,

			// Members table
			`DEFINE TABLE members SCHEMAFULL;`,

			// Members indexes
			`DEFINE INDEX idx_members_user ON members FIELDS user_id, guild_id;`,
			`DEFINE INDEX idx_members_hash ON members FIELDS profile_hash;`,

			// Voice states table
			`DEFINE TABLE voice_states SCHEMAFULL PERMISSIONS FULL;`,

			// Voice history table
			`DEFINE TABLE voice_history SCHEMAFULL PERMISSIONS FULL;`,

			// Voice sessions table
			`DEFINE TABLE voice_sessions SCHEMAFULL PERMISSIONS FULL;`,
		];

		const results = [];
		for (const query of schemaQueries) {
			console.log("🔹 Executing schema query...");
			const result = await client.query(query);
			results.push(result);
		}

		// Insert some test data
		console.log("🔹 Inserting test data...");

		// Test guild
		await client.query(`
			CREATE guilds:test_guild SET
				id = "guild_123",
				name = "Test Guild",
				owner_id = "user_456",
				created_at = time::now(),
				updated_at = time::now()
		`);

		// Test channel
		await client.query(`
			CREATE channels:test_channel SET
				id = "channel_789",
				guild_id = "guild_123",
				name = "General",
				type = 2,
				created_at = time::now(),
				updated_at = time::now()
		`);

		// Test member
		await client.query(`
			CREATE members:test_member SET
				id = "member_001",
				guild_id = "guild_123",
				user_id = "user_456",
				username = "testuser",
				display_name = "Test User",
				discriminator = "1234",
				joined_at = time::now(),
				roles = ["role_001"],
				profile_hash = "hash123",
				created_at = time::now(),
				updated_at = time::now()
		`);

		await client.close();

		return NextResponse.json({
			success: true,
			message: "Database schema created successfully",
			results: results,
		});
	} catch (error) {
		console.error("🔸 Schema setup failed:", error);

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
