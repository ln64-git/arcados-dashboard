"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

export function SSERefresherChannels() {
	const router = useRouter();
	const pollTimerRef = useRef<number | null>(null);
	const esRef = useRef<EventSource | null>(null);

	useEffect(() => {
		function startPolling() {
			if (pollTimerRef.current != null) return;
			console.log("Starting polling for realtime updates");
			
			let lastDataHash = '';
			
			pollTimerRef.current = window.setInterval(() => {
				fetch('/api/channels')
					.then((r) => r.json())
					.then((json) => {
						// Only update if data has actually changed
						const currentDataHash = JSON.stringify(json);
						if (currentDataHash !== lastDataHash) {
							console.log("Data changed, updating UI");
							lastDataHash = currentDataHash;
							const evt = new CustomEvent('channels:update', { detail: json });
							window.dispatchEvent(evt);
						}
					})
					.catch((err) => {
						console.error("Polling error:", err);
						router.refresh();
					});
			}, 500); // Poll every 500ms for ultra-realtime updates
		}

		function stopPolling() {
			if (pollTimerRef.current != null) {
				window.clearInterval(pollTimerRef.current);
				pollTimerRef.current = null;
			}
		}

		// Start polling immediately - SSE approach has connection pooling issues
		startPolling();
		
		return () => {
			stopPolling();
		};
	}, [router]);

	return null;
}
