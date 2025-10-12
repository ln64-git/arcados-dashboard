import { NextResponse } from "next/server";

export async function GET() {
	try {
		const botToken = process.env.DISCORD_BOT_TOKEN;
		const serverId = process.env.DISCORD_SERVER_ID;

		if (!botToken || !serverId) {
			return NextResponse.json(
				{
					error:
						"Missing DISCORD_BOT_TOKEN or DISCORD_SERVER_ID environment variables",
				},
				{ status: 500 },
			);
		}

		// Fetch server information from Discord API
		const response = await fetch(
			`https://discord.com/api/v10/guilds/${serverId}`,
			{
				headers: {
					Authorization: `Bot ${botToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			throw new Error(`Discord API error: ${response.status}`);
		}

		const serverData = await response.json();

		// Return server icon URL or default
		const iconUrl = serverData.icon
			? `https://cdn.discordapp.com/icons/${serverId}/${serverData.icon}.png?size=64`
			: null;

		return NextResponse.json({
			iconUrl,
			serverName: serverData.name,
			serverId: serverData.id,
		});
	} catch (error) {
		console.error("Error fetching Discord server icon:", error);
		return NextResponse.json(
			{ error: "Failed to fetch server icon" },
			{ status: 500 },
		);
	}
}
