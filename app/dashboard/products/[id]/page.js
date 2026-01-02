import ProductDetailsClient from "./ProductDetailsClient";

export default async function ProductDetailsPage({ params }) {
    const resolvedParams = await params;
    return <ProductDetailsClient productId={resolvedParams?.id} />;
}

