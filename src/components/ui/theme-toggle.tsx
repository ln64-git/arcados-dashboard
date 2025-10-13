"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
	const [isDark, setIsDark] = useState(true); // Default to dark mode

	useEffect(() => {
		// Check for saved theme preference or default to dark mode
		const savedTheme = localStorage.getItem("theme");
		const prefersDark = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;

		if (savedTheme === "light" || (!savedTheme && !prefersDark)) {
			setIsDark(false);
			document.documentElement.classList.remove("dark");
		} else {
			setIsDark(true);
			document.documentElement.classList.add("dark");
		}
	}, []);

	const toggleTheme = () => {
		const newTheme = !isDark;
		setIsDark(newTheme);

		if (newTheme) {
			document.documentElement.classList.add("dark");
			localStorage.setItem("theme", "dark");
		} else {
			document.documentElement.classList.remove("dark");
			localStorage.setItem("theme", "light");
		}
	};

	return (
		<Button
			variant="ghost"
			size="icon"
			onClick={toggleTheme}
			className="h-9 w-9"
		>
			{isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
