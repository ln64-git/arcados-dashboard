import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/surreal/client";
import type { VoiceHistory } from "@/lib/surreal/types";

/**
 * GET /api/voice-history
 * Get voice history for a user, guild, or channel
 */
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const userId = searchParams.get("user_id");
		const guildId = searchParams.get("guild_id");
		const channelId = searchParams.get("channel_id");
		const eventType = searchParams.get("event_type");
		const limit = parseInt(searchParams.get("limit") || "50", 10);
		const hours = parseInt(searchParams.get("hours") || "24", 10);

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

		if (eventType) {
			conditions.push("event_type = $event_type");
			params.event_type = eventType;
		}

		// Add time filter
		conditions.push("timestamp > time::now() - $hours * 1h");
		params.hours = hours;
		params.limit = limit;

		const whereClause =
			conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

		const query: string = `
			SELECT * FROM voice_history 
			${whereClause}
			ORDER BY timestamp DESC 
			LIMIT $limit
		`;

		const voiceHistory = await executeQuery<VoiceHistory>(query, params);

		return NextResponse.json({
			voiceHistory,
			totalEvents: voiceHistory.length,
			filters: { userId, guildId, channelId, eventType, limit, hours },
		});
	} catch (error) {
		console.error("🔸 Error fetching voice history:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch voice history",
				voiceHistory: [],
				totalEvents: 0,
			},
			{ status: 500 },
		);
	}
}
