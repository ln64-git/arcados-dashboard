"use client";

import { LogOut, User } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserProfile() {
	const { data: session, status } = useSession();

	if (status === "loading") {
		return (
			<div className="flex items-center gap-2">
				<div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
				<div className="h-4 w-20 bg-muted animate-pulse rounded" />
			</div>
		);
	}

	if (!session?.user) {
		return null;
	}

	const user = session.user;
	const avatarUrl = user.avatar
		? `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=64`
		: `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discriminator) % 5}.png`;

	const displayName = user.displayName || user.username;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<Avatar className="h-8 w-8">
						<AvatarImage src={avatarUrl} alt={displayName} />
						<AvatarFallback>
							<User className="h-4 w-4" />
						</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">{displayName}</p>
						<p className="text-xs leading-none text-muted-foreground">
							@{user.username}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="cursor-pointer"
					onSelect={() => signOut({ callbackUrl: "/login" })}
				>
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
