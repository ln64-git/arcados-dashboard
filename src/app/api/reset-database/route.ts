import { NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function POST() {
	try {
		console.log("🔹 Resetting database to empty state...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		// Clear all voice states and channels
		await client.query(`DELETE voice_states`);
		await client.query(`DELETE channels`);
		await client.query(`DELETE voice_history`);
		await client.query(`DELETE voice_sessions`);

		await client.close();

		return NextResponse.json({
			success: true,
			message: "Database reset successfully - all data cleared",
		});
	} catch (error) {
		console.error("🔸 Error resetting database:", error);

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
