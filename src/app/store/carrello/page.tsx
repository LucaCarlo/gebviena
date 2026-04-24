import Link from "next/link";
import { ShoppingBag } from "lucide-react";

export default function CartPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warm-100 flex items-center justify-center">
        <ShoppingBag size={28} className="text-warm-500" />
      </div>
      <h1 className="text-2xl font-light text-warm-900 mb-3">Carrello</h1>
      <p className="text-warm-600 text-sm leading-relaxed mb-8">
        Il carrello e il checkout con Stripe saranno attivi a breve.
        Intanto puoi esplorare i prodotti disponibili.
      </p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider hover:bg-warm-800">
        Esplora lo shop
      </Link>
    </div>
  );
}
