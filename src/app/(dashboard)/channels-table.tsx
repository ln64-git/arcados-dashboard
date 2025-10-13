"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Channel } from "./channel";

export interface DiscordChannel {
	id: string;
	name: string;
	type: number;
	position: number;
	userLimit: number;
	bitrate: number;
	parentId: string | null;
	permissionOverwrites: unknown[];
}

export function ChannelsTable({
	channels,
	offset,
	totalChannels,
}: {
	channels: DiscordChannel[];
	offset: number;
	totalChannels: number;
}) {
	const channelsPerPage = 5;

	function prevPage() {
		// For now, we'll just reload the page
		window.location.reload();
	}

	function nextPage() {
		// For now, we'll just reload the page
		window.location.reload();
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Voice Channels</CardTitle>
				<CardDescription>
					View and manage Discord voice channels in your server.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Channel Name</TableHead>
							<TableHead>Users</TableHead>
							<TableHead>
								<span className="sr-only">Actions</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{channels.map((channel) => (
							<Channel key={channel.id} channel={channel} />
						))}
					</TableBody>
				</Table>
			</CardContent>
			<CardFooter>
				<form className="flex items-center w-full justify-between">
					<div className="text-xs text-muted-foreground">
						Showing{" "}
						<strong>
							{Math.max(
								0,
								Math.min(offset - channelsPerPage, totalChannels) + 1,
							)}
							-{offset}
						</strong>{" "}
						of <strong>{totalChannels}</strong> channels
					</div>
					<div className="flex">
						<Button
							formAction={prevPage}
							variant="ghost"
							size="sm"
							type="submit"
							disabled={offset === channelsPerPage}
						>
							<ChevronLeft className="mr-2 h-4 w-4" />
							Prev
						</Button>
						<Button
							formAction={nextPage}
							variant="ghost"
							size="sm"
							type="submit"
							disabled={offset + channelsPerPage > totalChannels}
						>
							Next
							<ChevronRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				</form>
			</CardFooter>
		</Card>
	);
}
