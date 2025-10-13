import { Volume2 } from "lucide-react";
import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import type { DiscordChannel } from "./channels-table";

export function Channel({ channel }: { channel: DiscordChannel }) {
	// Use member count from database instead of hardcoded 0
	const currentUsers = channel.memberCount || 0;
	const maxUsers = channel.userLimit === 0 ? "∞" : channel.userLimit.toString();

	return (
		<TableRow className="cursor-pointer hover:bg-muted/50 transition-colors">
			<TableCell className="font-medium flex items-center gap-2">
				<Link href={`/channels/${channel.id}`} className="flex items-center gap-2 w-full">
					<Volume2 className="h-4 w-4 text-muted-foreground" />
					{channel.name}
				</Link>
			</TableCell>
			<TableCell>
				<span className="text-sm text-muted-foreground">
					{currentUsers}/{maxUsers}
				</span>
			</TableCell>
		</TableRow>
	);
}
