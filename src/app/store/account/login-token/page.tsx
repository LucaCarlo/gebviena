"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, XCircle } from "lucide-react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

export const dynamic = "force-dynamic";

export default function LoginTokenPage() {
  return (
    <Suspense fallback={<Loading />}>
      <Inner />
    </Suspense>
  );
}

function Loading() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center text-warm-500 text-sm">
      <Loader2 className="animate-spin mx-auto mb-3" size={20} />
      Verifica in corso…
    </div>
  );
}

function Inner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("t") || "";
  const { refresh } = useCustomerAuth();

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setError("Token mancante.");
      return;
    }
    (async () => {
      try {
        const res = await fetch("/api/store/public/auth/verify-magic-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const j = await res.json();
        if (!res.ok || !j.success) {
          setStatus("error");
          setError(j.error || "Link non valido o scaduto.");
          return;
        }
        await refresh();
        setStatus("ok");
        // Redirect rapido: se serve impostare la password va lì, altrimenti dashboard.
        setTimeout(() => {
          router.replace(j.data?.needsPasswordSetup ? "/account/setup-password" : "/account");
        }, 600);
      } catch {
        setStatus("error");
        setError("Errore di rete.");
      }
    })();
  }, [token, router, refresh]);

  if (status === "loading") return <Loading />;

  if (status === "ok") {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <Check size={36} className="mx-auto text-emerald-600 mb-3" />
        <h1 className="text-xl font-light text-warm-900 mb-1">Accesso effettuato</h1>
        <p className="text-warm-500 text-sm">Reindirizzamento in corso…</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <XCircle size={36} className="mx-auto text-red-500 mb-3" />
      <h1 className="text-xl font-light text-warm-900 mb-2">Link non valido</h1>
      <p className="text-warm-600 text-sm mb-6">{error}</p>
      <Link href="/account" className="inline-block px-6 py-3 bg-warm-900 text-white uppercase text-xs tracking-[0.2em] hover:bg-black">
        Richiedi un nuovo link
      </Link>
    </div>
  );
}
