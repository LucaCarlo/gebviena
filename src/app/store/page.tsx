import ShopFilters from "@/components/store/ShopFilters";
import StoreHeroSection from "@/components/store/StoreHeroSection";
import ShopGrid from "@/components/store/ShopGrid";
import type { ProductCardData } from "@/components/store/ProductCard";
import { getCurrentLang } from "@/lib/i18n";

export const dynamic = "force-dynamic";

async function getProducts(search: URLSearchParams, lang: string): Promise<ProductCardData[]> {
  try {
    const qs = new URLSearchParams(search);
    qs.set("lang", lang);
    const port = process.env.PORT || "3000";
    const res = await fetch(`http://127.0.0.1:${port}/api/store/public/products?${qs}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.success ? data.data : [];
  } catch {
    return [];
  }
}

export default async function ShopHomePage({ searchParams }: { searchParams: { [k: string]: string | string[] | undefined } }) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const products = await getProducts(qs, getCurrentLang());

  return (
    <>
      <StoreHeroSection />

      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-10">
        <aside>
          <ShopFilters />
        </aside>

        <ShopGrid products={products} />
      </div>
    </>
  );
}
