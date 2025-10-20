import { type NextRequest, NextResponse } from "next/server";
import { SurrealWebSocketClient } from "@/lib/surreal/SurrealWebSocketClient";
import {
	RECORD_ID_HELPERS,
	VOICE_EVENT_TYPES,
} from "@/lib/surreal/schema-definitions";

/**
 * GET /api/voice-states
 * Get current voice states for a guild or all active voice states
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const guildId = searchParams.get("guild_id");
		const channelId = searchParams.get("channel_id");
		const activeOnly = searchParams.get("active_only") === "true";

		// console.log("🔹 Fetching voice states with WebSocket client...");

		const client = new SurrealWebSocketClient();
		await client.connect();

		let query: string;
		const params: Record<string, unknown> = {};

		if (channelId) {
			query = `SELECT * FROM voice_states WHERE channel_id = $channelId`;
			params.channelId = channelId;
		} else if (guildId) {
			query = `SELECT * FROM voice_states WHERE guild_id = $guildId`;
			params.guildId = guildId;
		} else if (activeOnly) {
			query = `SELECT * FROM voice_states WHERE channel_id IS NOT NONE`;
		} else {
			query = `SELECT * FROM voice_states`;
		}

		console.log("🔹 Executing query:", query, params);
		const voiceStates = await client.query(query, params);
		// console.log("🔹 Query result:", voiceStates);

		await client.close();

		return NextResponse.json({
			voiceStates,
			totalStates: Array.isArray(voiceStates) ? voiceStates.length : 0,
			filters: { guildId, channelId, activeOnly },
		});
	} catch (error) {
		console.error("🔸 Error fetching voice states:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch voice states",
				voiceStates: [],
				totalStates: 0,
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/voice-states
 * Update or create a voice state (used by Discord bot)
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			guildId,
			userId,
			channelId,
			selfMute = false,
			selfDeaf = false,
			serverMute = false,
			serverDeaf = false,
			streaming = false,
			selfVideo = false,
			suppress = false,
			sessionId,
			eventType = VOICE_EVENT_TYPES.JOIN,
		} = body;

		if (!guildId || !userId) {
			return NextResponse.json(
				{ error: "guildId and userId are required" },
				{ status: 400 },
			);
		}

		const voiceStateId = RECORD_ID_HELPERS.voiceState(guildId, userId);
		const now = new Date();

		// UPSERT voice state
		const upsertQuery = `
			UPSERT type::thing("voice_states", $id) CONTENT {
				id: $id,
				guild_id: $guild_id,
				user_id: $user_id,
				channel_id: $channel_id,
				self_mute: $self_mute,
				self_deaf: $self_deaf,
				server_mute: $server_mute,
				server_deaf: $server_deaf,
				streaming: $streaming,
				self_video: $self_video,
				suppress: $suppress,
				session_id: $session_id,
				joined_at: $joined_at,
				created_at: $created_at,
				updated_at: $updated_at
			}
		`;

		const client = new SurrealWebSocketClient();
		await client.connect();

		await client.query(upsertQuery, {
			id: voiceStateId,
			guild_id: guildId,
			user_id: userId,
			channel_id: channelId || null,
			self_mute: selfMute,
			self_deaf: selfDeaf,
			server_mute: serverMute,
			server_deaf: serverDeaf,
			streaming: streaming,
			self_video: selfVideo,
			suppress: suppress,
			session_id: sessionId || null,
			joined_at: channelId ? now : null,
			created_at: now,
			updated_at: now,
		});

		// Log to voice history
		const historyId = RECORD_ID_HELPERS.voiceHistory(
			guildId,
			userId,
			now.toISOString(),
		);

		const historyQuery = `
			CREATE type::thing("voice_history", $id) CONTENT {
				id: $id,
				guild_id: $guild_id,
				user_id: $user_id,
				channel_id: $channel_id,
				event_type: $event_type,
				self_mute: $self_mute,
				self_deaf: $self_deaf,
				server_mute: $server_mute,
				server_deaf: $server_deaf,
				streaming: $streaming,
				self_video: $self_video,
				session_id: $session_id,
				timestamp: $timestamp,
				created_at: $created_at
			}
		`;

		await client.query(historyQuery, {
			id: historyId,
			guild_id: guildId,
			user_id: userId,
			channel_id: channelId || null,
			event_type: eventType,
			self_mute: selfMute,
			self_deaf: selfDeaf,
			server_mute: serverMute,
			server_deaf: serverDeaf,
			streaming: streaming,
			self_video: selfVideo,
			session_id: sessionId || null,
			timestamp: now,
			created_at: now,
		});

		await client.close();

		return NextResponse.json({
			success: true,
			voiceStateId,
			historyId,
			message: "Voice state updated successfully",
		});
	} catch (error) {
		console.error("🔸 Error updating voice state:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/voice-states
 * Clear voice state (when user leaves voice)
 */
export async function DELETE(request: NextRequest) {
	try {
		const body = await request.json();
		const { guildId, userId, eventType = VOICE_EVENT_TYPES.LEAVE } = body;

		if (!guildId || !userId) {
			return NextResponse.json(
				{ error: "guildId and userId are required" },
				{ status: 400 },
			);
		}

		const voiceStateId = RECORD_ID_HELPERS.voiceState(guildId, userId);
		const now = new Date();

		// Find and delete voice state record by guildId and userId
		const clearQuery = `
			DELETE voice_states WHERE guild_id = $guildId AND user_id = $userId
		`;

		const client = new SurrealWebSocketClient();
		await client.connect();

		await client.query(clearQuery, {
			guildId: guildId,
			userId: userId,
		});

		// Log to voice history
		const historyId = RECORD_ID_HELPERS.voiceHistory(
			guildId,
			userId,
			now.toISOString(),
		);

		const historyQuery = `
			CREATE type::thing("voice_history", $id) CONTENT {
				id: $id,
				guild_id: $guild_id,
				user_id: $user_id,
				channel_id: NONE,
				event_type: $event_type,
				self_mute: false,
				self_deaf: false,
				server_mute: false,
				server_deaf: false,
				streaming: false,
				self_video: false,
				session_id: NONE,
				timestamp: $timestamp,
				created_at: $created_at
			}
		`;

		await client.query(historyQuery, {
			id: historyId,
			guild_id: guildId,
			user_id: userId,
			event_type: eventType,
			timestamp: now,
			created_at: now,
		});

		await client.close();

		return NextResponse.json({
			success: true,
			voiceStateId,
			historyId,
			message: "Voice state cleared successfully",
		});
	} catch (error) {
		console.error("🔸 Error clearing voice state:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
