import { inArray } from "drizzle-orm";
import { Users, Volume2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { db, getChannelByDiscordId, users } from "@/lib/db";
import type { DiscordChannel } from "../../channels-table";

interface ChannelMember {
	id: string;
	username: string;
	displayName: string;
	avatar: string | null;
	discriminator: string;
}

async function getChannelDetails(channelId: string): Promise<{
	channel: DiscordChannel | null;
	error?: string;
}> {
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

		// Get user details for active users
		const activeMembers = await db
			.select({
				id: users.discordId,
				username: users.username,
				displayName: users.displayName,
				nickname: users.nickname,
				avatar: users.avatar,
				discriminator: users.discriminator,
			})
			.from(users)
			.where(inArray(users.discordId, channel.activeUserIds));

		console.log("Found active members:", activeMembers.length);

		// Map the results to use nickname if available, otherwise fall back to displayName
		const membersWithNicknames = activeMembers.map((member) => ({
			...member,
			displayName: member.nickname || member.displayName, // Use nickname if available, otherwise displayName
		}));

		return {
			members: membersWithNicknames,
			totalMembers: membersWithNicknames.length,
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
						<Volume2 className="h-8 w-8 text-muted-foreground" />
						{channel.name}
					</h1>
					<p className="text-muted-foreground">
						Voice channel details and current members
					</p>
					{membersError && (
						<p className="text-sm text-red-600 mt-2">
							🔸 Error: {membersError}
						</p>
					)}
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Volume2 className="h-5 w-5" />
							Channel Details
						</CardTitle>
						<CardDescription>
							Information about this voice channel
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Channel Name</span>
							<span className="text-sm text-muted-foreground">
								{channel.name}
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">User Limit</span>
							<Badge variant="secondary">{maxUsers}</Badge>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Bitrate</span>
							<span className="text-sm text-muted-foreground">
								{channel.bitrate} kbps
							</span>
						</div>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">Position</span>
							<span className="text-sm text-muted-foreground">
								{channel.position}
							</span>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="h-5 w-5" />
							Current Members
						</CardTitle>
						<CardDescription>
							Users currently in this voice channel
						</CardDescription>
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
											<p className="text-xs text-muted-foreground truncate">
												@{member.username}
											</p>
										</div>
									</div>
								))}
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
