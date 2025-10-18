export async function GET() {
	const envVars = {
		SURREAL_URL: process.env.SURREAL_URL,
		SURREAL_USERNAME: process.env.SURREAL_USERNAME,
		SURREAL_PASSWORD: process.env.SURREAL_PASSWORD,
		SURREAL_NAMESPACE: process.env.SURREAL_NAMESPACE,
		SURREAL_DATABASE: process.env.SURREAL_DATABASE,
	};

	return new Response(JSON.stringify(envVars, null, 2), {
		headers: { "Content-Type": "application/json" },
	});
}
