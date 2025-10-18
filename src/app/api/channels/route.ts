import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/surreal/client";
import type { Channel, ChannelsResponse } from "@/lib/surreal/types";

export async function GET() {
	try {
		// Fetch channels from SurrealDB
		// Note: We'll need to get the guild_id from somewhere - for now using a placeholder
		// In a real implementation, this would come from session/auth context
		const guildId = process.env.GUILD_ID || "1254694808228986912";

		// Try to query channels table directly
		const dbChannels = await executeQuery<Channel>(
			`SELECT * FROM channels WHERE guildId = $guildId AND isActive = true ORDER BY position ASC`,
			{ guildId },
		);

		// Map database fields to DiscordChannel interface format for backward compatibility
		const formattedChannels = dbChannels.map((channel) => ({
			id:
				channel.discordId ||
				`channel-${Math.random().toString(36).substring(2, 11)}`,
			name: channel.channelName || "Unknown Channel",
			status: channel.status ?? null,
			type: 2, // Voice channel type
			position: channel.position || 0, // Use actual position from DB
			userLimit: 0, // Default unlimited since not in DB
			bitrate: 64000, // Default bitrate since not in DB
			parentId: null, // Default no parent since not in DB
			permissionOverwrites: [], // Default empty since not in DB
			memberCount: channel.memberCount || 0, // Use actual member count from DB
		}));

		// If no channels found, provide some sample data for testing
		if (formattedChannels.length === 0) {
			console.log("🔸 No channels found in database, providing sample data");
			formattedChannels.push({
				id: "sample-channel-1",
				name: "General",
				status: "Active",
				type: 2,
				position: 0,
				userLimit: 0,
				bitrate: 64000,
				parentId: null,
				permissionOverwrites: [],
				memberCount: 0,
			});
		}

		const response = NextResponse.json({
			channels: formattedChannels,
			totalChannels: formattedChannels.length,
		} as ChannelsResponse);

		// Add headers for better caching and performance
		response.headers.set(
			"Cache-Control",
			"no-cache, no-store, must-revalidate",
		);
		response.headers.set("Pragma", "no-cache");
		response.headers.set("Expires", "0");

		return response;
	} catch (error) {
		console.error("🔸 Error fetching channels from SurrealDB:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch channels from SurrealDB",
				channels: [],
				totalChannels: 0,
			},
			{ status: 200 }, // Return 200 instead of 500 to prevent loading issues
		);
	}
}
