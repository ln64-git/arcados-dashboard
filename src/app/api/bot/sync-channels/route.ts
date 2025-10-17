import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		console.log("🔹 Channel sync requested");

		// Get the bot's sync endpoint
		const botUrl = process.env.BOT_SYNC_URL || "http://localhost:3001/api/sync";

		// Make a request to the bot to trigger channel sync
		const response = await fetch(botUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				type: "sync_channels",
				guildId: process.env.GUILD_ID || "1254694808228986912",
			}),
		});

		if (!response.ok) {
			throw new Error(`Bot sync request failed: ${response.statusText}`);
		}

		const result = await response.json();

		return NextResponse.json({
			success: true,
			message: "Channel sync triggered successfully",
			result,
		});
	} catch (error) {
		console.error("🔸 Error triggering channel sync:", error);

		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
