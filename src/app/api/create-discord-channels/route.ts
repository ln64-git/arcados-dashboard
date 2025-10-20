import { NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";

export async function POST() {
	try {
		console.log("🔹 Creating Discord channels based on bot agent report...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		const guildId = "1254694808228986912";

		// Create the actual Discord channels from bot agent report
		const channels = [
			{
				id: `channels:dojo_${guildId}`,
				guildId: guildId,
				name: "Dojo",
				type: 2, // Voice channel
				position: 0,
				isActive: true,
				memberCount: 0,
				status: "Active",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: `channels:cantina_${guildId}`,
				guildId: guildId,
				name: "Cantina",
				type: 2, // Voice channel
				position: 1,
				isActive: true,
				memberCount: 0,
				status: "Active",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: `channels:new_channel_${guildId}`,
				guildId: guildId,
				name: "New Channel",
				type: 2, // Voice channel
				position: 2,
				isActive: true,
				memberCount: 2, // From bot agent: McSwain + Lushpuppy
				status: "Active",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: `channels:afk_${guildId}`,
				guildId: guildId,
				name: "afk",
				type: 2, // Voice channel
				position: 3,
				isActive: true,
				memberCount: 0,
				status: "Active",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];

		// Insert channels
		for (const channel of channels) {
			await client.query(
				`
				CREATE ${channel.id} SET
					guildId = $guildId,
					name = $name,
					type = $type,
					position = $position,
					isActive = $isActive,
					memberCount = $memberCount,
					status = $status,
					createdAt = $createdAt,
					updatedAt = $updatedAt
			`,
				channel,
			);
			console.log(`🔹 Created channel: ${channel.name}`);
		}

		// Create voice states for users currently in New Channel (from bot agent report)
		const voiceStates = [
			{
				id: `voice_states:new_channel_mcswain_${guildId}`,
				guildId: guildId,
				userId: "mcswain_user_id", // McSwain
				channelId: `channels:new_channel_${guildId}`,
				selfMute: true, // Bot agent said: McSwain 🔇🔇🔇🔇 (Muted, Deafened, Server Muted, Server Deafened)
				selfDeaf: true,
				serverMute: true,
				serverDeaf: true,
				streaming: false,
				selfVideo: false,
				suppress: false,
				sessionId: "mcswain_session_id",
				joinedAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			{
				id: `voice_states:new_channel_lushpuppy_${guildId}`,
				guildId: guildId,
				userId: "1384677464961192007", // Lushpuppy
				channelId: `channels:new_channel_${guildId}`,
				selfMute: false, // Bot agent said: Lushpuppy 🔊👂
				selfDeaf: false,
				serverMute: false,
				serverDeaf: false,
				streaming: false,
				selfVideo: false,
				suppress: false,
				sessionId: "lushpuppy_session_id",
				joinedAt: new Date().toISOString(),
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
		];

		// Insert voice states
		for (const voiceState of voiceStates) {
			await client.query(
				`
				CREATE ${voiceState.id} SET
					guildId = $guildId,
					userId = $userId,
					channelId = $channelId,
					selfMute = $selfMute,
					selfDeaf = $selfDeaf,
					serverMute = $serverMute,
					serverDeaf = $serverDeaf,
					streaming = $streaming,
					selfVideo = $selfVideo,
					suppress = $suppress,
					sessionId = $sessionId,
					joinedAt = $joinedAt,
					createdAt = $createdAt,
					updatedAt = $updatedAt
			`,
				voiceState,
			);
			console.log(`🔹 Created voice state for user: ${voiceState.userId}`);
		}

		await client.close();

		return NextResponse.json({
			success: true,
			message:
				"Discord channels and voice states created based on bot agent report",
			channelsCreated: channels.length,
			voiceStatesCreated: voiceStates.length,
			summary: {
				dojo: 0,
				cantina: 0,
				newChannel: 2, // McSwain + Lushpuppy
				afk: 0,
			},
		});
	} catch (error) {
		console.error("🔸 Error creating Discord data:", error);

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
