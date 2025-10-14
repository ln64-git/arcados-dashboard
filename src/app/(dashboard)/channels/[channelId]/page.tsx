import { inArray, sql } from "drizzle-orm";
import { Users, Volume2 } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, getChannelByDiscordId, users } from "@/lib/db";
import type { DiscordChannel } from "../../channels-table";
// eslint-disable-next-line import/no-unresolved
import { DurationTicker } from "./duration-ticker";
import { SSERefresher } from "./sse-refresher";

export const dynamic = "force-dynamic";

interface ChannelMember {
	id: string;
	username: string;
	displayName: string;
	avatar: string | null;
	discriminator: string;
	joinedAt?: string | null;
	durationMs?: number;
}

async function getChannelDetails(channelId: string): Promise<{
	channel: DiscordChannel | null;
	error?: string;
}> {
	noStore();
	try {
		console.log("Fetching channel details from database:", channelId);

		// Fetch channel directly from database
		const dbChannel = await getChannelByDiscordId(channelId);

		if (!dbChannel) {
			return {
				channel: null,
				error: "Channel not found",
			};
		}

		// Map database fields to DiscordChannel interface format
		const channel: DiscordChannel = {
			id: dbChannel.discordId,
			name: dbChannel.channelName,
			status: dbChannel.status ?? null,
			type: 2, // Voice channel type
			position: dbChannel.position, // Use actual position from DB
			userLimit: 0, // Default unlimited since not in DB
			bitrate: 64000, // Default bitrate since not in DB
			parentId: null, // Default no parent since not in DB
			permissionOverwrites: [], // Default empty since not in DB
			memberCount: dbChannel.memberCount || 0, // Use actual member count from DB
		};

		return {
			channel,
		};
	} catch (error) {
		console.error("Error fetching channel details:", error);
		return {
			channel: null,
			error: `Failed to fetch channel details: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

async function getChannelMembers(channelId: string): Promise<{
	members: ChannelMember[];
	totalMembers: number;
	error?: string;
}> {
	noStore();
	try {
		console.log("Fetching members for channel:", channelId);

		// Get channel from database
		const channel = await getChannelByDiscordId(channelId);

		if (!channel) {
			return {
				members: [],
				totalMembers: 0,
				error: "Channel not found",
			};
		}

		// If no active users, return empty
		if (!channel.activeUserIds || channel.activeUserIds.length === 0) {
			return {
				members: [],
				totalMembers: 0,
			};
		}

		// Prefer precise joined_at from voice_channel_sessions if available
		const sessionsByUser = new Map<string, string>();
		try {
			const sessions = await db.execute(
				sql`SELECT user_id, joined_at FROM voice_channel_sessions WHERE channel_id = ${channelId} AND is_active = true`,
			);
			const rows =
				(
					sessions as unknown as {
						rows?: Array<{ user_id: string; joined_at: string }>;
					}
				).rows || [];
			for (const r of rows) {
				if (channel.activeUserIds.includes(r.user_id))
					sessionsByUser.set(r.user_id, r.joined_at);
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
			.where(inArray(users.discordId, channel.activeUserIds));

		console.log("Found active members:", activeMembersRaw.length);

		const now = Date.now();
		const membersWithDurations = activeMembersRaw.map((member) => {
			let joinedAt: string | null = sessionsByUser.get(member.id) || null;
			if (!joinedAt) {
				try {
					if (member.voiceInteractions) {
						const interactions = JSON.parse(member.voiceInteractions) as Array<{
							channelId?: string;
							joinedAt?: string;
							leftAt?: string;
						}>;
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
		membersWithDurations.sort(
			(a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0),
		);

		return {
			members: membersWithDurations,
			totalMembers: membersWithDurations.length,
		};
	} catch (error) {
		console.error("Error fetching channel members:", error);
		return {
			members: [],
			totalMembers: 0,
			error: `Failed to fetch channel members: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

export default async function ChannelPage({
	params,
}: {
	params: Promise<{ channelId: string }>;
}) {
	const { channelId } = await params;
	const { channel, error: channelError } = await getChannelDetails(channelId);
	const { members, error: membersError } = await getChannelMembers(channelId);

	if (channelError || !channel) {
		return (
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-3xl font-bold tracking-tight">
							Channel Not Found
						</h1>
						<p className="text-muted-foreground">
							The requested channel could not be found.
						</p>
						{channelError && (
							<p className="text-sm text-red-600 mt-2">
								🔸 Error: {channelError}
							</p>
						)}
					</div>
				</div>
			</div>
		);
	}

	const maxUsers = channel.userLimit === 0 ? "∞" : channel.userLimit.toString();

	return (
		<div className="space-y-4">
			<SSERefresher channelId={channel.id} />
			<div className="flex items-center justify-between gap-4">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<Volume2 className="h-8 w-8 text-muted-foreground" />
					{channel.name}
				</h1>
				<div className="flex items-center">
					<Badge variant="secondary">{maxUsers}</Badge>
				</div>
			</div>

			{channel.status && (
				<p className="text-muted-foreground">{channel.status}</p>
			)}
			{membersError && (
				<p className="text-sm text-red-600 mt-2">🔸 Error: {membersError}</p>
			)}

			<Card className="border-0 shadow-none">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Current Members
					</CardTitle>
				</CardHeader>
				<CardContent>
					{members.length === 0 ? (
						<div className="text-center py-8">
							<Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
							<p className="text-muted-foreground">
								No users currently in this channel
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{members.map((member) => (
								<div key={member.id} className="flex items-center gap-3">
									<Avatar className="h-8 w-8">
										<AvatarImage
											src={
												member.avatar
													? `https://cdn.discordapp.com/avatars/${member.id}/${member.avatar}.png`
													: undefined
											}
											alt={member.displayName}
										/>
										<AvatarFallback>
											{member.displayName.charAt(0).toUpperCase()}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1 min-w-0">
										<p className="text-sm font-medium truncate">
											{member.displayName}
										</p>
										<div className="flex items-center gap-2">
											<p className="text-xs text-muted-foreground truncate">
												@{member.username}
											</p>
											<DurationTicker start={member.joinedAt} />
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
