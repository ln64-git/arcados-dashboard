"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSurrealLiveQuery } from "@/hooks/useSurrealLiveQuery";

export function RealTimeTestComponent() {
	const [testResults, setTestResults] = useState<string[]>([]);
	const [isRunning, setIsRunning] = useState(false);

	const { isConnected, error, subscribeToVoiceSessions } = useSurrealLiveQuery({
		onVoiceSessionUpdate: (event) => {
			const timestamp = new Date().toLocaleTimeString();
			const message = `[${timestamp}] Voice session ${event.action}: ${JSON.stringify(event.result)}`;
			setTestResults((prev) => [...prev.slice(-9), message]); // Keep last 10 messages
		},
		onConnect: () => {
			const timestamp = new Date().toLocaleTimeString();
			setTestResults((prev) => [
				...prev.slice(-9),
				`[${timestamp}] 🔹 Connected to SSE`,
			]);
		},
		onDisconnect: () => {
			const timestamp = new Date().toLocaleTimeString();
			setTestResults((prev) => [
				...prev.slice(-9),
				`[${timestamp}] 🔸 Disconnected from SSE`,
			]);
		},
		onError: (error) => {
			const timestamp = new Date().toLocaleTimeString();
			setTestResults((prev) => [
				...prev.slice(-9),
				`[${timestamp}] 🔸 Error: ${error.message}`,
			]);
		},
	});

	const startTest = async () => {
		if (!isConnected) {
			setTestResults((prev) => [...prev.slice(-9), "🔸 Not connected to SSE"]);
			return;
		}

		setIsRunning(true);
		const timestamp = new Date().toLocaleTimeString();
		setTestResults((prev) => [
			...prev.slice(-9),
			`[${timestamp}] 🔹 Starting real-time test...`,
		]);

		try {
			// Subscribe to all voice sessions for testing
			await subscribeToVoiceSessions(undefined, () => {
				// Callback is handled by onVoiceSessionUpdate
			});

			setTestResults((prev) => [
				...prev.slice(-9),
				`[${timestamp}] 🔹 Subscribed to voice sessions`,
			]);
		} catch (error) {
			const errorTimestamp = new Date().toLocaleTimeString();
			setTestResults((prev) => [
				...prev.slice(-9),
				`[${errorTimestamp}] 🔸 Test failed: ${error}`,
			]);
		}
	};

	const stopTest = () => {
		setIsRunning(false);
		const timestamp = new Date().toLocaleTimeString();
		setTestResults((prev) => [
			...prev.slice(-9),
			`[${timestamp}] 🔸 Test stopped`,
		]);
	};

	const clearResults = () => {
		setTestResults([]);
	};

	return (
		<Card className="w-full max-w-2xl">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					Real-Time Test
					<Badge variant={isConnected ? "default" : "destructive"}>
						{isConnected ? "🟢 Connected" : "🔴 Disconnected"}
					</Badge>
					{error && <Badge variant="destructive">Error: {error}</Badge>}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex gap-2">
					<button
						onClick={startTest}
						disabled={!isConnected || isRunning}
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
					>
						{isRunning ? "Running..." : "Start Test"}
					</button>
					<button
						onClick={stopTest}
						disabled={!isRunning}
						className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
					>
						Stop Test
					</button>
					<button
						onClick={clearResults}
						className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
					>
						Clear Results
					</button>
				</div>

				<div className="bg-gray-100 p-4 rounded min-h-[200px] max-h-[400px] overflow-y-auto">
					{testResults.length === 0 ? (
						<p className="text-gray-500 italic">No test results yet...</p>
					) : (
						<div className="space-y-1">
							{testResults.map((result, index) => (
								<div key={index} className="text-sm font-mono">
									{result}
								</div>
							))}
						</div>
					)}
				</div>

				<div className="text-xs text-gray-500">
					<p>
						This component tests the real-time SSE connection and voice session
						updates.
					</p>
					<p>Status: {isConnected ? "Connected to SSE" : "Not connected"}</p>
					{error && <p className="text-red-500">Error: {error}</p>}
				</div>
			</CardContent>
		</Card>
	);
}
