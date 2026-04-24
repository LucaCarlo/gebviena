import Link from "next/link";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/store/ProductDetail";

export const dynamic = "force-dynamic";

async function getProduct(slug: string) {
  try {
    const res = await fetch(`http://127.0.0.1:3002/api/store/public/products/${encodeURIComponent(slug)}?lang=it`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product) notFound();

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <nav className="text-xs text-warm-500 mb-6">
        <Link href="/" className="hover:text-warm-900">Shop</Link>
        {product.category && (
          <>
            <span className="mx-2">·</span>
            <span>{product.category.name}</span>
          </>
        )}
        <span className="mx-2">·</span>
        <span className="text-warm-700">{product.name}</span>
      </nav>

      <ProductDetail product={product} />
    </div>
  );
}
