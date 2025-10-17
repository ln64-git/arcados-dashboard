import { NextResponse } from "next/server";
import { executeQuery, executeQueryOne } from "@/lib/surreal/client";
import type { Channel, User, VoiceChannelSession } from "@/lib/surreal/types";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ channelId: string }> },
) {
	try {
		const { channelId } = await params;
		console.log("🔹 Fetching members for channel:", channelId);

		// Get guild_id from environment or use default
		const guildId = process.env.GUILD_ID || "default-guild";

		// Get channel from SurrealDB
		const channel = await executeQueryOne<Channel>(
			`SELECT * FROM channels WHERE discord_id = $discord_id AND guild_id = $guild_id`,
			{ discord_id: channelId, guild_id: guildId },
		);

		if (!channel) {
			return NextResponse.json(
				{
					members: [],
					totalMembers: 0,
					error: "Channel not found",
				},
				{ status: 200 },
			);
		}

		// Fetch active voice sessions for this channel
		const activeSessions = await executeQuery<VoiceChannelSession>(
			`SELECT * FROM voice_channel_sessions WHERE channel_id = $channel_id AND is_active = true`,
			{ channel_id: channelId },
		);

		// If no active sessions, return empty
		if (activeSessions.length === 0) {
			return NextResponse.json({
				members: [],
				totalMembers: 0,
			});
		}

		// Get user data for active members
		const activeUserIds = activeSessions.map((session) => session.userId);
		const users = await executeQuery<User>(
			`SELECT * FROM users WHERE discord_id IN $user_ids AND guild_id = $guild_id`,
			{ user_ids: activeUserIds, guild_id: guildId },
		);

		// Create sessions map for quick lookup
		const sessionsByUser = new Map<string, VoiceChannelSession>();
		for (const session of activeSessions) {
			sessionsByUser.set(session.userId, session);
		}

		// Build member data with duration calculation
		const now = Date.now();
		const activeMembers = users.map((user) => {
			const session = sessionsByUser.get(user.discordId);
			const joinedAt = session?.joinedAt.toISOString() || null;
			const durationMs = joinedAt
				? Math.max(0, now - new Date(joinedAt).getTime())
				: 0;

			return {
				id: user.discordId,
				username: user.username,
				displayName: user.nickname || user.displayName,
				avatar: user.avatar,
				discriminator: user.discriminator,
				joinedAt,
				durationMs,
			};
		});

		// Sort by longest in channel
		activeMembers.sort((a, b) => b.durationMs - a.durationMs);

		console.log("🔹 Found active members:", activeMembers.length);

		return NextResponse.json({
			members: activeMembers,
			totalMembers: activeMembers.length,
		});
	} catch (error) {
		console.error("🔸 Error fetching channel members from SurrealDB:", error);
		return NextResponse.json(
			{
				error: "Failed to fetch channel members",
				members: [],
				totalMembers: 0,
			},
			{ status: 200 }, // Return 200 instead of 500 to prevent loading issues
		);
	}
}
