export default {
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "avatars.githubusercontent.com",
				search: "",
			},
			{
				protocol: "https",
				hostname: "*.public.blob.vercel-storage.com",
				search: "",
			},
		],
	},
	// Disable Vercel Analytics debug mode
	env: {
		VERCEL_ANALYTICS_DEBUG: "false",
	},
};
