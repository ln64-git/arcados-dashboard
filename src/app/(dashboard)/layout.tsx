import { Analytics } from "@vercel/analytics/react";
import {
	Package,
	Package2,
	PanelLeft,
} from "lucide-react";
import Link from "next/link";
import { ServerIcon } from "@/components/server-icon";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbList,
	BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { NavItem } from "./nav-item";
import Providers from "./providers";

export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
		return (
			<Providers>
				<main className="flex min-h-screen w-full flex-col bg-background">
					<DesktopNav />
					<div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
						<header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
							<MobileNav />
							<DashboardBreadcrumb />
							<div className="ml-auto">
								<ThemeToggle />
							</div>
						</header>
						<main className="grid flex-1 items-start gap-2 p-4 sm:px-6 sm:py-0 md:gap-4 bg-background">
							{children}
						</main>
					</div>
					<Analytics />
				</main>
			</Providers>
		);
}

function DesktopNav() {
	return (
		<aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
			<nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
				<div className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full md:h-8 md:w-8">
					<ServerIcon className="h-9 w-9 transition-all group-hover:scale-110 md:h-8 md:w-8" />
					<span className="sr-only">Arcados</span>
				</div>

				<NavItem href="/" label="Products">
					<Package className="h-5 w-5" />
				</NavItem>
			</nav>
			<nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
				<Tooltip>
					<TooltipTrigger asChild>
						<ThemeToggle />
					</TooltipTrigger>
					<TooltipContent side="right">Toggle theme</TooltipContent>
				</Tooltip>
			</nav>
		</aside>
	);
}

function MobileNav() {
	return (
		<Sheet>
			<SheetTrigger asChild>
				<Button size="icon" variant="outline" className="sm:hidden">
					<PanelLeft className="h-5 w-5" />
					<span className="sr-only">Toggle Menu</span>
				</Button>
			</SheetTrigger>
			<SheetContent side="left" className="sm:max-w-xs">
				<nav className="grid gap-6 text-lg font-medium">
					<div className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base">
						<Package2 className="h-5 w-5 transition-all group-hover:scale-110" />
						<span className="sr-only">Arcados</span>
					</div>
					<Link
						href="/"
						className="flex items-center gap-4 px-2.5 text-foreground"
					>
						<Package className="h-5 w-5" />
						Products
					</Link>
				</nav>
			</SheetContent>
		</Sheet>
	);
}

function DashboardBreadcrumb() {
	return (
		<Breadcrumb className="hidden md:flex">
			<BreadcrumbList>
				<BreadcrumbItem>
					<BreadcrumbPage>Products</BreadcrumbPage>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	);
}
