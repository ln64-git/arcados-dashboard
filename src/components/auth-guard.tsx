"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

interface AuthGuardProps {
	children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
	const { data: session, status } = useSession();
	const router = useRouter();

	useEffect(() => {

		if (status === "loading") {
			return; // Still loading
		}

		if (status === "unauthenticated" || !session) {
			console.log("🔸 AuthGuard: Not authenticated, redirecting to login");
			router.push("/login");
			return;
		}

	}, [status, session, router]);

	// Show loading while checking authentication
	if (status === "loading") {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
					<p>Loading...</p>
				</div>
			</div>
		);
	}

	// Don't render anything if not authenticated (will redirect)
	if (status === "unauthenticated" || !session) {
		return null;
	}

	// Render children if authenticated
	return <>{children}</>;
}
