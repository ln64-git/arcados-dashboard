"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function SSERefresher({ channelId }: { channelId: string }) {
	const router = useRouter();
	const pollTimerRef = useRef<number | null>(null);

	useEffect(() => {
		function startPolling() {
			if (pollTimerRef.current != null) return;
			console.log("Starting polling for channel updates:", channelId);
			pollTimerRef.current = window.setInterval(() => {
				console.log("Channel polling refresh triggered");
				router.refresh();
			}, 1000); // Poll every 1 second for channel updates
		}

		function stopPolling() {
			if (pollTimerRef.current != null) {
				window.clearInterval(pollTimerRef.current);
				pollTimerRef.current = null;
			}
		}

		// Start polling immediately - SSE approach removed
		startPolling();
		
		return () => {
			stopPolling();
		};
	}, [channelId, router]);

	return null;
}
