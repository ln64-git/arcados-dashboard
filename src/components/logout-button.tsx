"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
	return (
		<Button
			variant="ghost"
			size="sm"
			onClick={() => signOut()}
			className="flex items-center gap-2"
		>
			<LogOut className="h-4 w-4" />
			Logout
		</Button>
	);
}
