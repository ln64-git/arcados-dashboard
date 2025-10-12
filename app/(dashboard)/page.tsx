import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/db";
import { ProductsTable } from "./products-table";

export default async function ProductsPage(props: {
	searchParams: Promise<{ q: string; offset: string }>;
}) {
	const searchParams = await props.searchParams;
	const search = searchParams.q ?? "";
	const offset = searchParams.offset ?? 0;
	const { products, newOffset, totalProducts } = await getProducts(
		search,
		Number(offset),
	);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Products</h1>
					<p className="text-muted-foreground">
						Manage your products and view their sales performance.
					</p>
				</div>
				<Button className="gap-2">
					<PlusCircle className="h-4 w-4" />
					Add Product
				</Button>
			</div>
			<ProductsTable
				products={products}
				offset={newOffset ?? 0}
				totalProducts={totalProducts}
			/>
		</div>
	);
}
