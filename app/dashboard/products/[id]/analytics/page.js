import ProductAnalyticsClient from "./ProductAnalyticsClient";

export default async function ProductAnalyticsPage({ params }) {
    const resolvedParams = await params;
    const productId = resolvedParams?.id;

    return <ProductAnalyticsClient productId={productId} />;
}
