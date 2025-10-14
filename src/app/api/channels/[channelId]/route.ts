import { inArray, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, getChannelByDiscordId, users } from "@/lib/db";

export async function GET(
	_req: Request,
	{ params }: { params: { channelId: string } },
) {
	const { channelId } = params;

	try {
		const channel = await getChannelByDiscordId(channelId);
		if (!channel)
			return NextResponse.json({ error: "Channel not found" }, { status: 404 });

		let sessionsRows: Array<{ user_id: string; joined_at: string }> = [];
		try {
			const sessions = await db.execute(
				sql`SELECT user_id, joined_at FROM voice_channel_sessions WHERE channel_id = ${channelId} AND is_active = true`,
			);
			sessionsRows =
				(
					sessions as unknown as {
						rows?: Array<{ user_id: string; joined_at: string }>;
					}
				).rows || [];
		} catch {}
		const sessionsByUser = new Map<string, string>();
		for (const r of sessionsRows) sessionsByUser.set(r.user_id, r.joined_at);

		const activeIds = channel.activeUserIds || [];
		const activeMembersRaw = activeIds.length
			? await db
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
					.where(inArray(users.discordId, activeIds))
			: [];

		const now = Date.now();
		const members = activeMembersRaw.map((m) => {
			let joinedAt: string | null = sessionsByUser.get(m.id) || null;
			if (!joinedAt && m.voiceInteractions) {
				try {
					const interactions = JSON.parse(m.voiceInteractions) as Array<{
						channelId?: string;
						joinedAt?: string;
						leftAt?: string;
					}>;
					const match = interactions.find(
						(i) => i.channelId === channelId && i.joinedAt && !i.leftAt,
					);
					if (match?.joinedAt) joinedAt = match.joinedAt;
				} catch {}
			}
			return {
				id: m.id,
				username: m.username,
				displayName: m.nickname || m.displayName,
				avatar: m.avatar,
				discriminator: m.discriminator,
				joinedAt,
				durationMs: joinedAt
					? Math.max(0, now - new Date(joinedAt).getTime())
					: 0,
			};
		});
		members.sort((a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0));

		return NextResponse.json({
			channel: channel
				? {
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
					}
				: null,
			members,
		});
	} catch (err) {
		return NextResponse.json(
			{ error: err instanceof Error ? err.message : "Unknown error" },
			{ status: 500 },
		);
	}
}
