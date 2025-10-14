import { NextResponse } from "next/server";
import { getAllChannels } from "@/lib/db";

export async function GET() {
	try {
		console.log("Fetching channels from database...");

		// Fetch channels from database
		const dbChannels = await getAllChannels();
		console.log("Fetched channels count:", dbChannels.length);

		// Map database fields to DiscordChannel interface format
		const formattedChannels = dbChannels.map((channel) => ({
			id: channel.discordId,
			name: channel.channelName,
			status: channel.status ?? null,
			type: 2, // Voice channel type
			position: channel.position, // Use actual position from DB
			userLimit: 0, // Default unlimited since not in DB
			bitrate: 64000, // Default bitrate since not in DB
			parentId: null, // Default no parent since not in DB
			permissionOverwrites: [], // Default empty since not in DB
			memberCount: channel.memberCount || 0, // Use actual member count from DB
		}));

		console.log("Formatted channels count:", formattedChannels.length);

		return NextResponse.json({
			channels: formattedChannels,
			totalChannels: formattedChannels.length,
		});
	} catch (error) {
		console.error("Error fetching channels from database:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch channels from database",
				channels: [],
				totalChannels: 0,
			},
			{ status: 200 }, // Return 200 instead of 500 to prevent loading issues
		);
	}
}
