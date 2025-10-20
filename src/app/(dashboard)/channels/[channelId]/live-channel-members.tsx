"use client";

import { Mic, MicOff, Users, Video, Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DurationTicker } from "./duration-ticker";

interface ChannelMember {
	id: string;
	username: string;
	displayName: string;
	avatar: string | null;
	discriminator: string;
	joinedAt?: string | null;
	durationMs?: number;
	selfMute?: boolean;
	selfDeaf?: boolean;
	serverMute?: boolean;
	serverDeaf?: boolean;
	streaming?: boolean;
	selfVideo?: boolean;
	sessionId?: string;
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
	const [error, setError] = useState<string | null>(null);
	const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;

		console.log("🔹 Setting up polling for channel members...");

		const baseUrl = window.location.origin;
		let intervalId: NodeJS.Timeout;

		const fetchMembers = async () => {
			try {
				const response = await fetch(
					`${baseUrl}/api/channels/${channelId}/members`,
				);
				if (!response.ok) {
					throw new Error(`HTTP ${response.status}: ${response.statusText}`);
				}

				const result = await response.json();
				console.log(
					"🔹 Channel members updated:",
					result.members.length,
					"members",
				);
				setMembers(result.members);
				setLastUpdate(new Date());
				setIsConnected(true);
				setError(null);
			} catch (err) {
				console.error("🔸 Error fetching channel members:", err);
				setError(err instanceof Error ? err.message : "Unknown error");
				setIsConnected(false);
			}
		};

		// Initial fetch
		fetchMembers();

		// Set up polling (every 2 seconds for channel members)
		intervalId = setInterval(fetchMembers, 2000);

		return () => {
			console.log("🔹 Cleaning up channel members polling");
			if (intervalId) {
				clearInterval(intervalId);
			}
			setIsConnected(false);
		};
	}, [channelId]);

	const getStatusIcons = (member: ChannelMember) => {
		const icons = [];

		if (member.streaming) {
			icons.push(<Video key="streaming" className="h-3 w-3 text-purple-500" />);
		}

		if (member.selfMute || member.serverMute) {
			icons.push(<MicOff key="mute" className="h-3 w-3 text-red-500" />);
		} else {
			icons.push(<Mic key="unmute" className="h-3 w-3 text-green-500" />);
		}

		if (member.selfDeaf || member.serverDeaf) {
			icons.push(<VolumeX key="deaf" className="h-3 w-3 text-red-500" />);
		} else {
			icons.push(<Volume2 key="undeaf" className="h-3 w-3 text-green-500" />);
		}

		return icons;
	};

	return (
		<Card className="border-0 shadow-none">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Users className="h-5 w-5" />
					Current Members ({members.length})
					{isConnected && (
						<Badge variant="outline" className="text-xs text-green-600">
							🟢 Live
						</Badge>
					)}
					{error && (
						<Badge variant="destructive" className="text-xs">
							🔴 Error
						</Badge>
					)}
				</CardTitle>
				{lastUpdate && (
					<p className="text-xs text-muted-foreground">
						Last updated: {lastUpdate.toLocaleTimeString()}
					</p>
				)}
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
							<div
								key={member.id}
								className="flex items-center gap-3 p-2 rounded-lg border"
							>
								<Avatar className="h-10 w-10">
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
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium truncate">
											{member.displayName}
										</p>
										<div className="flex items-center gap-1">
											{getStatusIcons(member)}
										</div>
									</div>
									<div className="flex items-center gap-2">
										<p className="text-xs text-muted-foreground truncate">
											@{member.username}
										</p>
										<DurationTicker start={member.joinedAt} />
									</div>
									{member.sessionId && (
										<p className="text-xs text-muted-foreground">
											Session: {member.sessionId.slice(0, 8)}...
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
