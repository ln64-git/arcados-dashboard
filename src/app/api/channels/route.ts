import { NextResponse } from "next/server";

export async function GET() {
	try {
		const botToken = process.env.DISCORD_BOT_TOKEN;
		const serverId = process.env.DISCORD_SERVER_ID;

		console.log("Discord API Debug:", {
			hasBotToken: !!botToken,
			hasServerId: !!serverId,
			serverId: serverId ? `${serverId.substring(0, 8)}...` : "undefined",
		});

		// Check if Discord credentials are configured
		if (!botToken || !serverId) {
			console.error("Missing Discord environment variables");
			return NextResponse.json(
				{
					channels: [],
					totalChannels: 0,
					error:
						"Discord credentials not configured. Please set DISCORD_BOT_TOKEN and DISCORD_SERVER_ID environment variables.",
				},
				{ status: 200 },
			);
		}

		// Fetch channels from Discord API with timeout
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		try {
			const response = await fetch(
				`https://discord.com/api/v10/guilds/${serverId}/channels`,
				{
					headers: {
						Authorization: `Bot ${botToken}`,
						"Content-Type": "application/json",
					},
					signal: controller.signal,
				},
			);

			clearTimeout(timeoutId);
			console.log("Discord API Response Status:", response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error("Discord API error:", response.status, errorText);

				// Return empty channels instead of error to prevent loading issues
				return NextResponse.json({
					channels: [],
					totalChannels: 0,
					error: `Discord API error: ${response.status}`,
				});
			}

			const channels = await response.json();
			console.log("Fetched channels count:", channels.length);

			// Filter for voice channels only (type 2) and exclude "New Channel"
			const voiceChannels = channels.filter(
				(channel: { type: number; name: string }) =>
					channel.type === 2 && !channel.name.includes("New Channel"),
			);

			console.log("Voice channels count:", voiceChannels.length);

			// Format the channels data and sort by position
			const formattedChannels = voiceChannels
				.map(
					(channel: {
						id: string;
						name: string;
						type: number;
						position: number;
						user_limit: number;
						bitrate: number;
						parent_id: string | null;
						permission_overwrites: unknown[];
					}) => ({
						id: channel.id,
						name: channel.name,
						type: channel.type,
						position: channel.position,
						userLimit: channel.user_limit,
						bitrate: channel.bitrate,
						parentId: channel.parent_id,
						permissionOverwrites: channel.permission_overwrites,
					}),
				)
				.sort((a, b) => a.position - b.position);

			return NextResponse.json({
				channels: formattedChannels,
				totalChannels: formattedChannels.length,
			});
		} catch (fetchError) {
			clearTimeout(timeoutId);
			console.error("Discord API fetch error:", fetchError);

			// Return error if Discord API fails
			return NextResponse.json({
				channels: [],
				totalChannels: 0,
				error: `Discord API error: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`,
			});
		}
	} catch (error) {
		console.error("Error fetching Discord voice channels:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch voice channels",
				channels: [],
				totalChannels: 0,
			},
			{ status: 200 }, // Return 200 instead of 500 to prevent loading issues
		);
	}
}
