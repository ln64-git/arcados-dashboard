"use client";

import { Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSurrealLiveQuery } from "@/hooks/useSurrealLiveQuery";
import { DurationTicker } from "./duration-ticker";

interface ChannelMember {
	id: string;
	username: string;
	displayName: string;
	avatar: string | null;
	discriminator: string;
	joinedAt?: string | null;
	durationMs?: number;
}

interface LiveChannelMembersProps {
	initialMembers: ChannelMember[];
	channelId: string;
}

export function LiveChannelMembers({
	initialMembers,
	channelId,
}: LiveChannelMembersProps) {
	const [members, setMembers] = useState<ChannelMember[]>(initialMembers);
	const [isConnected, setIsConnected] = useState(false);

	const {
		subscribeToVoiceSessions,
		isConnected: sseConnected,
		error,
	} = useSurrealLiveQuery({
		onVoiceSessionUpdate: (event) => {
			console.log("🔹 Voice session update for channel:", channelId, event);

			const sessionData = event.result as any;

			// Only process updates for this channel
			if (sessionData.channelId !== channelId) {
				return;
			}

			setMembers((prevMembers) => {
				if (event.action === "CREATE") {
					// User joined the channel
					const newMember: ChannelMember = {
						id: sessionData.userId,
						username: sessionData.username || "Unknown",
						displayName:
							sessionData.displayName || sessionData.username || "Unknown",
						avatar: sessionData.avatar || null,
						discriminator: sessionData.discriminator || "0000",
						joinedAt: sessionData.joinedAt,
						durationMs: 0,
					};

					// Check if member already exists (avoid duplicates)
					const exists = prevMembers.some(
						(member) => member.id === newMember.id,
					);
					if (!exists) {
						return [...prevMembers, newMember];
					}
				} else if (event.action === "DELETE") {
					// User left the channel
					return prevMembers.filter(
						(member) => member.id !== sessionData.userId,
					);
				} else if (event.action === "UPDATE") {
					// User data updated (e.g., duration)
					return prevMembers.map((member) =>
						member.id === sessionData.userId
							? { ...member, joinedAt: sessionData.joinedAt }
							: member,
					);
				}

				return prevMembers;
			});
		},
		onConnect: () => {
			console.log(
				"🔹 Connected to voice session updates for channel:",
				channelId,
			);
			setIsConnected(true);
		},
		onDisconnect: () => {
			console.log(
				"🔸 Disconnected from voice session updates for channel:",
				channelId,
			);
			setIsConnected(false);
		},
		onError: (error) => {
			console.error("🔸 Error in voice session subscription:", error);
		},
	});

	useEffect(() => {
		if (!sseConnected) {
			console.warn(
				"🔸 Not connected to SSE, skipping voice session subscription",
			);
			return;
		}

		let subscriptionId: string | null = null;

		const setupSubscription = async () => {
			try {
				// Subscribe to voice sessions for this specific channel
				subscriptionId = await subscribeToVoiceSessions(channelId, () => {
					// Callback is handled by onVoiceSessionUpdate
				});

				console.log(`🔹 Subscribed to voice sessions for channel ${channelId}`);
			} catch (error) {
				console.error("🔸 Error setting up voice session subscription:", error);
			}
		};

		setupSubscription();

		return () => {
			// Cleanup subscription
			if (subscriptionId) {
				console.log(
					`🔹 Cleaning up voice session subscription for channel ${channelId}`,
				);
			}
		};
	}, [channelId, sseConnected, subscribeToVoiceSessions]);

	return (
		<Card className="border-0 shadow-none">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Current Members
					{isConnected && (
						<span className="text-xs text-green-600 ml-2">🟢 Live</span>
					)}
					{error && <span className="text-xs text-red-600 ml-2">🔴 Error</span>}
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
	);
}
