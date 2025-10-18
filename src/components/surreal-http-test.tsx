"use client";

import { SurrealHttpClient } from "@/lib/surreal/SurrealHttpClient";

export function SurrealHttpTest() {
	const testConnection = async () => {
		try {
			console.log("🔹 Testing SurrealDB HTTP connection...");
			const client = new SurrealHttpClient({
				onConnect: () => console.log("🔹 Connected successfully!"),
				onError: (error) => console.error("🔸 Connection error:", error),
			});

			await client.connect();
			
			// Test a simple query
			const result = await client.executeQuery("SELECT * FROM users LIMIT 1");
			console.log("🔹 Query result:", result);
			
			await client.disconnect();
			console.log("🔹 Test completed successfully!");
		} catch (error) {
			console.error("🔸 Test failed:", error);
		}
	};

	return (
		<div className="p-4">
			<h2 className="text-xl font-bold mb-4">SurrealDB HTTP Client Test</h2>
			<button
				onClick={testConnection}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
			>
				Test Connection
			</button>
			<p className="mt-2 text-sm text-gray-600">
				Check the browser console for test results.
			</p>
		</div>
	);
}
