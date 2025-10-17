import { NextResponse } from "next/server";
import { executeQuery, executeQueryOne } from "@/lib/surreal/client";
import type { Channel, User, VoiceChannelSession } from "@/lib/surreal/types";

export async function GET(
	_req: Request,
	{ params }: { params: { channelId: string } },
) {
	const { channelId } = params;

	try {
		// Get guild_id from environment or use default
		const guildId = process.env.GUILD_ID || "default-guild";

		// Fetch channel from SurrealDB
		const channel = await executeQueryOne<Channel>(
			`SELECT * FROM channels WHERE discord_id = $discord_id AND guild_id = $guild_id`,
			{ discord_id: channelId, guild_id: guildId },
		);

		if (!channel) {
			return NextResponse.json({ error: "Channel not found" }, { status: 404 });
		}

		// Fetch active voice sessions for this channel
		const activeSessions = await executeQuery<VoiceChannelSession>(
			`SELECT * FROM voice_channel_sessions WHERE channel_id = $channel_id AND is_active = true`,
			{ channel_id: channelId },
		);

		// Get user data for active members
		const activeUserIds = activeSessions.map((session) => session.userId);
		let activeMembers: Array<{
			id: string;
			username: string;
			displayName: string;
			nickname?: string;
			avatar?: string;
			discriminator: string;
			joinedAt: string | null;
			durationMs: number;
		}> = [];

		if (activeUserIds.length > 0) {
			const users = await executeQuery<User>(
				`SELECT * FROM users WHERE discord_id IN $user_ids AND guild_id = $guild_id`,
				{ user_ids: activeUserIds, guild_id: guildId },
			);

			const now = Date.now();
			activeMembers = users.map((user) => {
				// Find the session for this user
				const session = activeSessions.find((s) => s.userId === user.discordId);
				const joinedAt = session?.joinedAt.toISOString() || null;

				return {
					id: user.discordId,
					username: user.username,
					displayName: user.nickname || user.displayName,
					nickname: user.nickname,
					avatar: user.avatar,
					discriminator: user.discriminator,
					joinedAt,
					durationMs: joinedAt
						? Math.max(0, now - new Date(joinedAt).getTime())
						: 0,
				};
			});

			// Sort by duration (longest first)
			activeMembers.sort((a, b) => b.durationMs - a.durationMs);
		}

		return NextResponse.json({
			channel: {
				id: channel.discordId,
				name: channel.channelName,
				status: channel.status ?? null,
				type: 2,
				position: channel.position,
				userLimit: 0,
				bitrate: 64000,
				parentId: null,
				permissionOverwrites: [],
				memberCount: channel.memberCount || 0,
			},
			members: activeMembers,
		});
	} catch (err) {
		console.error("🔸 Error fetching channel details from SurrealDB:", err);
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
