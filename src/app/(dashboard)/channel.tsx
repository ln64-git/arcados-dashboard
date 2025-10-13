import { MoreHorizontal, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TableCell, TableRow } from "@/components/ui/table";
import type { DiscordChannel } from "./channels-table";

export function Channel({ channel }: { channel: DiscordChannel }) {
	// For now, we'll show 0 users since we don't have real-time user count data
	// This could be enhanced later with Discord API calls to get current user count
	const currentUsers = 0;
	const maxUsers = channel.userLimit === 0 ? "∞" : channel.userLimit.toString();

	return (
		<TableRow>
			<TableCell className="font-medium flex items-center gap-2">
				<Volume2 className="h-4 w-4 text-muted-foreground" />
				{channel.name}
			</TableCell>
			<TableCell>
				<span className="text-sm text-muted-foreground">
					{currentUsers}/{maxUsers}
				</span>
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button aria-haspopup="true" size="icon" variant="ghost">
							<MoreHorizontal className="h-4 w-4" />
							<span className="sr-only">Toggle menu</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Actions</DropdownMenuLabel>
						<DropdownMenuItem>View Details</DropdownMenuItem>
						<DropdownMenuItem>Edit Permissions</DropdownMenuItem>
						<DropdownMenuItem className="text-red-600">
							Delete Channel
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}
