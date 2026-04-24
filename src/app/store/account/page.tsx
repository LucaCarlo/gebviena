import Link from "next/link";
import { User, LogIn } from "lucide-react";

export default function AccountPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-warm-100 flex items-center justify-center">
        <User size={28} className="text-warm-500" />
      </div>
      <h1 className="text-2xl font-light text-warm-900 mb-3">Area riservata</h1>
      <p className="text-warm-600 text-sm leading-relaxed mb-8">
        Registrati per tenere traccia dei tuoi ordini, salvare i tuoi indirizzi di spedizione e velocizzare i prossimi acquisti.
      </p>
      <div className="space-y-3">
        <button disabled className="w-full inline-flex items-center justify-center gap-2 py-3 bg-warm-900 text-white uppercase text-sm tracking-wider disabled:bg-warm-300">
          <LogIn size={14} /> Login / Registrazione
        </button>
        <div className="text-xs text-warm-500">
          Sistema di autenticazione in arrivo.
        </div>
      </div>
      <div className="mt-10 pt-6 border-t border-warm-200">
        <Link href="/" className="text-sm text-warm-600 hover:text-warm-900">
          ← Torna allo shop
        </Link>
      </div>
    </div>
  );
}
