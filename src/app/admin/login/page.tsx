"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        router.push("/admin");
      } else {
        setError(data.error || "Errore di login");
      }
    } catch {
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.webp" alt="GTV" width={80} height={66} className="mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-warm-800">Admin Dashboard</h1>
          <p className="text-sm text-warm-500 mt-1">Accedi al pannello di gestione</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1.5 uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm text-warm-800 focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 transition"
              placeholder="admin@gebvienna.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-600 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm text-warm-800 focus:border-warm-800 focus:outline-none focus:ring-1 focus:ring-warm-800 transition"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-warm-800 text-white py-2.5 rounded text-sm font-medium hover:bg-warm-900 disabled:opacity-50 transition-colors"
          >
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>
      </div>
    </div>
  );
}
