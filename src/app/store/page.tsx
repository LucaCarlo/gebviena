import Link from "next/link";
import Image from "next/image";
import ShopFilters from "@/components/store/ShopFilters";
import StoreHeroSection from "@/components/store/StoreHeroSection";

export const dynamic = "force-dynamic";

interface ProductCard {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  coverImage: string | null;
  priceFromCents: number;
  variantsCount: number;
  inStock: boolean;
  category: { slug: string; name: string } | null;
}

function eur(cents: number) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(cents / 100);
}

async function getProducts(search: URLSearchParams, host: string | null): Promise<ProductCard[]> {
  try {
    const baseUrl = host ? `http://${host}` : "http://127.0.0.1:3002";
    const qs = new URLSearchParams(search);
    qs.set("lang", "it");
    const res = await fetch(`${baseUrl}/api/store/public/products?${qs}`, { cache: "no-store" });
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
  const products = await getProducts(qs, null);

  return (
    <>
      {/* Hero gestito da admin (HeroSlide page=store-home) */}
      <StoreHeroSection />

      {/* Body: filtri + griglia */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-10">
        <aside>
          <ShopFilters />
        </aside>

        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="text-sm text-warm-600">
              {products.length} prodott{products.length === 1 ? "o" : "i"}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="text-center py-24 text-warm-500 border border-warm-200 rounded-lg">
              Nessun prodotto disponibile al momento. I nuovi arrivi verranno pubblicati qui.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((p) => (
                <ProductCardView key={p.id} p={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ProductCardView({ p }: { p: ProductCard }) {
  return (
    <Link href={`/prodotti/${p.slug}`} className="group block">
      <div className="aspect-[4/5] bg-warm-100 rounded overflow-hidden relative">
        {p.coverImage ? (
          <Image
            src={p.coverImage}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : null}
        {!p.inStock && (
          <div className="absolute top-3 right-3 bg-warm-900 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded">
            Esaurito
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1">
        {p.category && (
          <div className="text-[10px] uppercase tracking-[0.15em] text-warm-500">{p.category.name}</div>
        )}
        <div className="text-sm font-medium text-warm-900">{p.name}</div>
        {p.shortDescription && (
          <div className="text-xs text-warm-500 line-clamp-1">{p.shortDescription}</div>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="text-sm font-mono text-warm-900">
            {p.variantsCount > 1 ? "da " : ""}{eur(p.priceFromCents)}
          </div>
          {p.variantsCount > 1 && (
            <div className="text-[10px] text-warm-500">{p.variantsCount} varianti</div>
          )}
        </div>
      </div>
    </Link>
  );
}
