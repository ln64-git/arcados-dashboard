"use client";

import { useEffect, useState } from "react";

export function EnvironmentTest() {
	const [serverEnv, setServerEnv] = useState<string>("");
	const [clientEnv, setClientEnv] = useState<string>("");
	const [serverTest, setServerTest] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		// Test client-side environment variables
		const clientVars = {
			NEXT_PUBLIC_SURREAL_URL: process.env.NEXT_PUBLIC_SURREAL_URL,
			NEXT_PUBLIC_SURREAL_NAMESPACE: process.env.NEXT_PUBLIC_SURREAL_NAMESPACE,
			NEXT_PUBLIC_SURREAL_DATABASE: process.env.NEXT_PUBLIC_SURREAL_DATABASE,
			NEXT_PUBLIC_SURREAL_USERNAME: process.env.NEXT_PUBLIC_SURREAL_USERNAME,
			NEXT_PUBLIC_SURREAL_PASSWORD: process.env.NEXT_PUBLIC_SURREAL_PASSWORD,
			NEXT_PUBLIC_SURREAL_TOKEN: process.env.NEXT_PUBLIC_SURREAL_TOKEN,
		};
		setClientEnv(JSON.stringify(clientVars, null, 2));

		// Test server-side environment variables
		fetch("/api/test-env")
			.then((res) => res.json())
			.then((data) => setServerEnv(JSON.stringify(data, null, 2)))
			.catch((err) => setServerEnv(`Error: ${err.message}`));
	}, []);

	const testServerConnection = async () => {
		setIsLoading(true);
		setServerTest("Testing...");
		
		try {
			const response = await fetch("/api/test-surreal-server");
			const data = await response.json();
			setServerTest(JSON.stringify(data, null, 2));
		} catch (err) {
			setServerTest(`Error: ${err instanceof Error ? err.message : String(err)}`);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="p-4">
			<h2 className="text-xl font-bold mb-4">Environment Variables Test</h2>
			
			<div className="mb-6">
				<h3 className="text-lg font-semibold mb-2">Client-Side Environment Variables:</h3>
				<pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
					{clientEnv}
				</pre>
			</div>

			<div className="mb-6">
				<h3 className="text-lg font-semibold mb-2">Server-Side Environment Variables:</h3>
				<pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
					{serverEnv}
				</pre>
			</div>

			<div className="mb-6">
				<h3 className="text-lg font-semibold mb-2">Server-Side Connection Test:</h3>
				<button
					type="button"
					onClick={testServerConnection}
					disabled={isLoading}
					className="mb-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
				>
					{isLoading ? "Testing..." : "Test Server Connection"}
				</button>
				<pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
					{serverTest}
				</pre>
			</div>

			<div className="bg-yellow-100 border border-yellow-400 text-yellow-700 p-3 rounded">
				<h4 className="font-semibold">Required Environment Variables:</h4>
				<p className="text-sm mt-1">
					<strong>Server-side:</strong> SURREAL_URL, SURREAL_NAMESPACE, SURREAL_DATABASE, SURREAL_USERNAME, SURREAL_PASSWORD (or SURREAL_TOKEN)
				</p>
				<p className="text-sm mt-1">
					<strong>Client-side:</strong> NEXT_PUBLIC_SURREAL_URL, NEXT_PUBLIC_SURREAL_NAMESPACE, NEXT_PUBLIC_SURREAL_DATABASE, NEXT_PUBLIC_SURREAL_USERNAME, NEXT_PUBLIC_SURREAL_PASSWORD (or NEXT_PUBLIC_SURREAL_TOKEN)
				</p>
			</div>
		</div>
	);
}
