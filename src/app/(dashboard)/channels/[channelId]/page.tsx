import { Users, Volume2 } from "lucide-react";
import { unstable_noStore as noStore } from "next/cache";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { executeQuery, executeQueryOne } from "@/lib/surreal/client";
import type { Channel, User, VoiceChannelSession } from "@/lib/surreal/types";
import type { DiscordChannel } from "../../channels-table";
// eslint-disable-next-line import/no-unresolved
import { DurationTicker } from "./duration-ticker";

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
		console.log("Fetching channel details from SurrealDB:", channelId);

		// Get guild_id from environment or use default
		const guildId = process.env.GUILD_ID || "default-guild";

		// Fetch channel directly from SurrealDB
		const dbChannel = await executeQueryOne<Channel>(
			`SELECT * FROM channels WHERE discord_id = $discord_id AND guild_id = $guild_id`,
			{ discord_id: channelId, guild_id: guildId },
		);

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

		// Get guild_id from environment or use default
		const guildId = process.env.GUILD_ID || "default-guild";

		// Get channel from SurrealDB
		const channel = await executeQueryOne<Channel>(
			`SELECT * FROM channels WHERE discord_id = $discord_id AND guild_id = $guild_id`,
			{ discord_id: channelId, guild_id: guildId },
		);

		if (!channel) {
			return {
				members: [],
				totalMembers: 0,
				error: "Channel not found",
			};
		}

		// Get active voice sessions for this channel
		const activeSessions = await executeQuery<VoiceChannelSession>(
			`SELECT * FROM voice_channel_sessions WHERE channel_id = $channel_id AND is_active = true`,
			{ channel_id: channelId },
		);

		if (activeSessions.length === 0) {
			return {
				members: [],
				totalMembers: 0,
			};
		}

		// Get user data for active members
		const activeUserIds = activeSessions.map((session) => session.userId);
		const users = await executeQuery<User>(
			`SELECT * FROM users WHERE discord_id IN $user_ids AND guild_id = $guild_id`,
			{ user_ids: activeUserIds, guild_id: guildId },
		);

		const sessionsByUser = new Map<string, VoiceChannelSession>();
		for (const session of activeSessions) {
			sessionsByUser.set(session.userId, session);
		}

		const now = Date.now();
		const membersWithDurations = users.map((user) => {
			const session = sessionsByUser.get(user.discordId);
			const joinedAt = session?.joinedAt.toISOString() || null;
			const durationMs = joinedAt
				? Math.max(0, now - new Date(joinedAt).getTime())
				: 0;

			return {
				id: user.discordId,
				username: user.username,
				displayName: user.nickname || user.displayName,
				avatar: user.avatar || null,
				discriminator: user.discriminator,
				joinedAt,
				durationMs,
			};
		});

		// Sort by longest in channel
		membersWithDurations.sort(
			(a, b) => (b.durationMs ?? 0) - (a.durationMs ?? 0),
		);

		console.log("Found active members:", membersWithDurations.length);

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
