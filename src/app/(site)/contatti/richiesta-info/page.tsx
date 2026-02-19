"use client";

import { useState } from "react";
import Image from "next/image";

export default function RichiestaInfoPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, type: "info" }),
    });
    setSent(true);
  };

  return (
    <>
      <section className="relative h-[35vh] flex items-center justify-center bg-warm-900">
        <Image src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=1920&h=600&fit=crop" alt="Richiesta Informazioni" fill className="object-cover opacity-30" />
        <h1 className="relative font-serif text-3xl md:text-5xl text-white text-center">Richiesta informazioni</h1>
      </section>

      <section className="section-padding">
        <div className="luxury-container max-w-2xl">
          <p className="text-sm text-warm-600 leading-relaxed mb-12 text-center">
            Compila il modulo sottostante per ricevere informazioni sui nostri prodotti,
            servizi o qualsiasi altra richiesta.
          </p>

          {sent ? (
            <div className="text-center py-12">
              <h2 className="font-serif text-2xl text-warm-800 mb-4">Messaggio inviato!</h2>
              <p className="text-sm text-warm-600">Ti risponderemo il prima possibile.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Nome e Cognome *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" required />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Oggetto</label>
                <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-warm-600 uppercase tracking-wider mb-1.5">Messaggio *</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={6} className="w-full border border-warm-300 rounded px-4 py-2.5 text-sm focus:border-warm-800 focus:outline-none" required />
              </div>
              <button type="submit" className="w-full bg-warm-800 text-white py-3 rounded text-sm font-medium uppercase tracking-wider hover:bg-warm-900 transition-colors">
                Invia messaggio
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
