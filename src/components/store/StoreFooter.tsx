import Link from "next/link";

export default function StoreFooter() {
  return (
    <footer className="border-t border-warm-200 bg-warm-50 mt-16">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-2">Gebrüder Thonet Vienna</div>
            <p className="text-warm-700 leading-relaxed">
              Store online della storica maison viennese. Sedute, tavoli e complementi di design.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-3">Shop</div>
            <ul className="space-y-1.5 text-warm-700">
              <li><Link href="/" className="hover:text-warm-900">Home store</Link></li>
              <li><Link href="/account" className="hover:text-warm-900">Area riservata</Link></li>
              <li><Link href="/carrello" className="hover:text-warm-900">Carrello</Link></li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-warm-500 mb-3">Collezione</div>
            <p className="text-warm-700">
              <Link href="https://dev.gebruederthonetvienna.com/prodotti" className="hover:text-warm-900 underline">
                Esplora il catalogo completo →
              </Link>
            </p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-warm-200 flex flex-wrap justify-between gap-2 text-xs text-warm-500">
          <div>© {new Date().getFullYear()} Gebrüder Thonet Vienna. Tutti i diritti riservati.</div>
          <div className="flex gap-4">
            <Link href="/privacy">Privacy</Link>
            <Link href="/termini">Termini</Link>
            <Link href="/spedizioni">Spedizioni</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
