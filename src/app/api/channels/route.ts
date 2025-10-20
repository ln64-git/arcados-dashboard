import { NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function GET() {
	try {
		// Fetch channels from SurrealDB
		// Note: We'll need to get the guild_id from somewhere - for now using a placeholder
		// In a real implementation, this would come from session/auth context
		const guildId = process.env.GUILD_ID || "1254694808228986912";

		// Use WebSocket client for better performance and real-time capabilities
		const client = new SurrealWebSocketClient();
		await client.connect();

		// Get current voice states to calculate real-time member counts
		const voiceStates = await client.query(
			`SELECT channel_id, user_id FROM voice_states WHERE guild_id = $guildId AND channel_id IS NOT NONE`,
			{ guildId },
		);

		await client.close();

		// Extract the actual data from the nested array structure
		const actualVoiceStates =
			Array.isArray(voiceStates) &&
			voiceStates.length > 0 &&
			Array.isArray(voiceStates[0])
				? voiceStates[0]
				: voiceStates;

		// Count members per channel
		const memberCounts: Record<string, number> = {};
		if (Array.isArray(actualVoiceStates)) {
			actualVoiceStates.forEach((vs: { channel_id?: string }) => {
				if (vs.channel_id) {
					memberCounts[vs.channel_id] = (memberCounts[vs.channel_id] || 0) + 1;
				}
			});
		}

		// Create channel mapping from Discord channel IDs to names
		const channelMapping: Record<string, { name: string; position: number }> = {
			"1427152903260344350": { name: "Cantina", position: 1 },
			"1428282734173880440": { name: "New Channel", position: 2 },
			"1423746690342588516": { name: "afk", position: 3 },
			"1287323426465513512": { name: "Dojo", position: 0 },
		};

		// Create channels from active voice states
		const activeChannelIds = new Set<string>();
		if (Array.isArray(actualVoiceStates)) {
			actualVoiceStates.forEach((vs: { channel_id?: string }) => {
				if (vs.channel_id && vs.channel_id !== "channel_789") {
					// Skip test data
					activeChannelIds.add(vs.channel_id);
				}
			});
		}

		// Add all channels (active and empty)
		const allChannelIds = new Set([
			...Object.keys(channelMapping),
			...activeChannelIds,
		]);
		const formattedChannels = Array.from(allChannelIds)
			.map((channelId) => {
				const channelInfo = channelMapping[channelId] || {
					name: "Unknown Channel",
					position: 999,
				};
				return {
					id: channelId,
					name: channelInfo.name,
					status: "Active",
					type: 2, // Voice channel type
					position: channelInfo.position,
					userLimit: 0, // Default unlimited
					bitrate: 64000, // Default bitrate
					parentId: null, // Default no parent
					permissionOverwrites: [], // Default empty
					memberCount: memberCounts[channelId] || 0, // Real-time count from voice states
				};
			})
			.sort((a, b) => a.position - b.position);

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
