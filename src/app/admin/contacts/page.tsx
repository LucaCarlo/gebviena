"use client";

import { useEffect, useState } from "react";
import { Mail, MailOpen } from "lucide-react";
import type { ContactSubmission } from "@/types";

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contact")
      .then((r) => r.json())
      .then((data) => { setContacts(data.data || []); setLoading(false); });
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-warm-800 mb-8">Messaggi</h1>

      {loading ? (
        <div className="text-warm-400">Caricamento...</div>
      ) : contacts.length === 0 ? (
        <div className="text-center py-12 text-warm-400">Nessun messaggio ricevuto</div>
      ) : (
        <div className="space-y-4">
          {contacts.map((c) => (
            <div key={c.id} className="bg-white rounded-xl shadow-sm border border-warm-200 p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {c.isRead ? (
                    <MailOpen size={18} className="text-warm-400" />
                  ) : (
                    <Mail size={18} className="text-brand-500" />
                  )}
                  <div>
                    <p className="font-medium text-warm-800">{c.name}</p>
                    <p className="text-xs text-warm-500">{c.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-1 bg-warm-100 text-warm-600 text-xs rounded">{c.type}</span>
                  <p className="text-xs text-warm-400 mt-1">
                    {new Date(c.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
              </div>
              {c.subject && <p className="text-sm font-medium text-warm-700 mb-2">{c.subject}</p>}
              <p className="text-sm text-warm-600 leading-relaxed">{c.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
