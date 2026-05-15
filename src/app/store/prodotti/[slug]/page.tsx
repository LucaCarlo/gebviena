import Link from "next/link";
import { notFound } from "next/navigation";
import ProductDetail from "@/components/store/ProductDetail";
import { getCurrentLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

async function getProduct(slug: string, lang: string) {
  try {
    const port = process.env.PORT || "3000";
    const res = await fetch(`http://127.0.0.1:${port}/api/store/public/products/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`, {
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
  const lang = getCurrentLang();
  const product = await getProduct(params.slug, lang);
  if (!product) notFound();

  const isFr = lang === "fr";

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
      <nav className="text-xs text-warm-500 mb-6">
        <Link href="/" className="hover:text-warm-900">{isFr ? "Boutique" : "Shop"}</Link>
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
