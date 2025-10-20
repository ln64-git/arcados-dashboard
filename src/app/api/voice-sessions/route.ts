import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/surreal/client";
import type { VoiceSession } from "@/lib/surreal/types";

/**
 * GET /api/voice-sessions
 * Get active voice sessions or session history
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");
		const guildId = searchParams.get("guild_id");
		const channelId = searchParams.get("channel_id");
		const activeOnly = searchParams.get("active_only") === "true";
		const limit = parseInt(searchParams.get("limit") || "50", 10);

		// Build query based on filters
		const conditions: string[] = [];
		const params: Record<string, unknown> = {};

		if (userId) {
			conditions.push("user_id = $user_id");
			params.user_id = userId;
		}

		if (guildId) {
			conditions.push("guild_id = $guild_id");
			params.guild_id = guildId;
		}

		if (channelId) {
			conditions.push("channel_id = $channel_id");
			params.channel_id = channelId;
		}

		if (activeOnly) {
			conditions.push("active = true");
		}

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		const query: string = `
			SELECT * FROM voice_sessions 
			${whereClause}
			ORDER BY joined_at DESC 
			LIMIT $limit
		`;
		params.limit = limit;

		const voiceSessions = await executeQuery<VoiceSession>(query, params);

		return NextResponse.json({
			voiceSessions,
			totalSessions: voiceSessions.length,
			filters: { userId, guildId, channelId, activeOnly, limit },
		});
	} catch (error) {
		console.error("🔸 Error fetching voice sessions:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch voice sessions",
				voiceSessions: [],
				totalSessions: 0,
			},
			{ status: 500 },
		);
	}
}

/**
 * POST /api/voice-sessions
 * Create or update a voice session
 */
export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const {
			guildId,
			userId,
			channelId,
			sessionId,
			action = "join", // join, leave, switch
		} = body;

		if (!guildId || !userId || !channelId) {
			return NextResponse.json(
				{ error: "guildId, userId, and channelId are required" },
				{ status: 400 },
			);
		}

		const now = new Date();
		const sessionRecordId =
			sessionId || `${guildId}_${userId}_${now.getTime()}`;

		if (action === "join") {
			// Create new session
			const createQuery = `
				CREATE type::thing("voice_sessions", $id) CONTENT {
					id: $id,
					guild_id: $guild_id,
					user_id: $user_id,
					channel_id: $channel_id,
					joined_at: $joined_at,
					duration: 0,
					channels_visited: [$channel_id],
					switch_count: 0,
					time_muted: 0,
					time_deafened: 0,
					time_streaming: 0,
					active: true,
					created_at: $created_at,
					updated_at: $updated_at
				}
			`;

			await executeQuery(createQuery, {
				id: sessionRecordId,
				guild_id: guildId,
				user_id: userId,
				channel_id: channelId,
				joined_at: now,
				created_at: now,
				updated_at: now,
			});

			return NextResponse.json({
				success: true,
				sessionId: sessionRecordId,
				message: "Voice session created successfully",
			});
		} else if (action === "leave") {
			// End session
			const endQuery = `
				UPDATE type::thing("voice_sessions", $id) SET
					left_at: $left_at,
					duration: $duration,
					active: false,
					updated_at: $updated_at
			`;

			// Calculate duration (simplified - in real implementation, you'd track this properly)
			const duration = 0; // This would be calculated based on joined_at

			await executeQuery(endQuery, {
				id: sessionRecordId,
				left_at: now,
				duration: duration,
				updated_at: now,
			});

			return NextResponse.json({
				success: true,
				sessionId: sessionRecordId,
				message: "Voice session ended successfully",
			});
		} else if (action === "switch") {
			// Update session for channel switch
			const switchQuery = `
				UPDATE type::thing("voice_sessions", $id) SET
					channel_id: $channel_id,
					channels_visited: array::append(channels_visited, $channel_id),
					switch_count: switch_count + 1,
					updated_at: $updated_at
			`;

			await executeQuery(switchQuery, {
				id: sessionRecordId,
				channel_id: channelId,
				updated_at: now,
			});

			return NextResponse.json({
				success: true,
				sessionId: sessionRecordId,
				message: "Voice session updated for channel switch",
			});
		}

		return NextResponse.json(
			{ error: "Invalid action. Must be 'join', 'leave', or 'switch'" },
			{ status: 400 },
		);
	} catch (error) {
		console.error("🔸 Error managing voice session:", error);
		return NextResponse.json(
			{
				success: false,
				error: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
