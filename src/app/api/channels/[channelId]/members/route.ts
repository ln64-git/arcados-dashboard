import { inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, getChannelByDiscordId, users } from "@/lib/db";

export async function GET(
	_request: Request,
	{ params }: { params: Promise<{ channelId: string }> },
) {
	try {
		const { channelId } = await params;
		console.log("Fetching members for channel:", channelId);

		// Get channel from database
		const channel = await getChannelByDiscordId(channelId);

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

		// Normalize active user ids (filter out null/empty)
		const activeIds = (channel.activeUserIds || []).filter(
			(id): id is string => typeof id === "string" && id.trim().length > 0,
		);

		// If no valid active users, return empty
		if (activeIds.length === 0) {
			return NextResponse.json({
				members: [],
				totalMembers: 0,
			});
		}

		// Try sessions table for precise joined_at
		const sessionsByUser = new Map<string, string>();
		try {
			const sessions = await db.execute(
				sql`SELECT user_id, joined_at FROM voice_channel_sessions WHERE channel_id = ${channelId} AND is_active = true`,
			);
			const rows: Array<{ user_id: string; joined_at: string }> =
				(sessions as any).rows || [];
			for (const r of rows) {
				if (activeIds.includes(r.user_id)) {
					sessionsByUser.set(r.user_id, r.joined_at);
				}
			}
		} catch {}

		// Get user details for active users
		const activeMembersRaw = await db
			.select({
				id: users.discordId,
				username: users.username,
				displayName: users.displayName,
				nickname: users.nickname,
				avatar: users.avatar,
				discriminator: users.discriminator,
				voiceInteractions: users.voiceInteractions,
			})
			.from(users)
			.where(inArray(users.discordId, activeIds));

		// Derive joinedAt for this channel from voiceInteractions
		const now = Date.now();
		const activeMembers = activeMembersRaw.map((member) => {
			let joinedAt: string | null = null;
			// Prefer sessions table joined_at if available
			joinedAt = sessionsByUser.get(member.id) || null;
			// Fallback to open voice interaction (no leftAt)
			if (!joinedAt) {
				try {
					if (member.voiceInteractions) {
						const interactions = JSON.parse(
							member.voiceInteractions as unknown as string,
						) as Array<{
							channelId?: string;
							joinedAt?: string;
							leftAt?: string;
						}>; // stored as text/jsonb
						const match = interactions.find(
							(i) => i.channelId === channelId && i.joinedAt && !i.leftAt,
						);
						if (match?.joinedAt) joinedAt = match.joinedAt;
					}
				} catch {}
			}
			const durationMs = joinedAt
				? Math.max(0, now - new Date(joinedAt).getTime())
				: 0;
			return {
				id: member.id,
				username: member.username,
				displayName: member.nickname || member.displayName,
				avatar: member.avatar,
				discriminator: member.discriminator,
				joinedAt,
				durationMs,
			};
		});

		// Sort by longest in channel
		activeMembers.sort((a, b) => b.durationMs - a.durationMs);

		console.log("Found active members:", activeMembers.length);

		return NextResponse.json({
			members: activeMembers,
			totalMembers: activeMembers.length,
		});
	} catch (error) {
		console.error("Error fetching channel members:", error);
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
