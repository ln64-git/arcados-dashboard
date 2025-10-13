"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface ChannelInfo {
	id: string;
	name: string;
}

export function DynamicBreadcrumb() {
	const pathname = usePathname();
	const [channelName, setChannelName] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// Parse the pathname to generate breadcrumbs
	const pathSegments = pathname.split("/").filter(Boolean);

	// Fetch channel name if we're on a channel page
	useEffect(() => {
		if (pathSegments[0] === "channels" && pathSegments[1]) {
			setLoading(true);
			fetchChannelName(pathSegments[1])
				.then((name) => {
					setChannelName(name);
				})
				.catch((error) => {
					console.error("Failed to fetch channel name:", error);
					setChannelName(null);
				})
				.finally(() => {
					setLoading(false);
				});
		} else {
			setChannelName(null);
		}
	}, [pathSegments]);

	// Build breadcrumb items
	const breadcrumbItems: Array<{ label: string; href: string; isLast?: boolean }> = [];

	// Always start with Dashboard
	breadcrumbItems.push({
		label: "Dashboard",
		href: "/",
	});

	// Add Channels for the main channels page
	if (pathname === "/") {
		breadcrumbItems.push({
			label: "Channels",
			href: "/",
		});
	} else if (pathSegments[0] === "channels") {
		// Add Channels link
		breadcrumbItems.push({
			label: "Channels",
			href: "/",
		});

		// If we're on a specific channel page, add the channel name
		if (pathSegments[1]) {
			const channelLabel = loading
				? "Loading..."
				: channelName || "Channel";

			breadcrumbItems.push({
				label: channelLabel,
				href: `/channels/${pathSegments[1]}`,
			});
		}
	}

	// Set isLast for the last item
	breadcrumbItems.forEach((item, index) => {
		item.isLast = index === breadcrumbItems.length - 1;
	});

	return (
		<Breadcrumb className="hidden md:flex">
			<BreadcrumbList className="flex items-center space-x-2">
				{breadcrumbItems.map((item, index) => (
					<React.Fragment key={`${item.label}-${item.href}`}>
						<BreadcrumbItem>
							{item.isLast ? (
								<BreadcrumbPage>{item.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link href={item.href}>{item.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{index < breadcrumbItems.length - 1 && (
							<span className="text-muted-foreground">/</span>
						)}
					</React.Fragment>
				))}
			</BreadcrumbList>
		</Breadcrumb>
	);
}

async function fetchChannelName(channelId: string): Promise<string | null> {
	try {
		const response = await fetch('/api/channels', {
			cache: "no-store",
			headers: {
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.status}`);
		}

		const data = await response.json();
		const channel = data.channels.find(
			(ch: ChannelInfo) => ch.id === channelId,
		);

		return channel ? channel.name : null;
	} catch (error) {
		console.error("Error fetching channel name:", error);
		return null;
	}
}
