"use client";

import { BarChart3, Clock } from "lucide-react";

export default function EmailAnalyticsPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-warm-900">Analitiche Email</h1>
        <p className="text-sm text-warm-500 mt-1">Report dettagliati sulle email inviate</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-warm-200 p-12 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-warm-100 mb-4">
          <BarChart3 size={28} className="text-warm-400" />
        </div>
        <h2 className="text-lg font-semibold text-warm-900 mb-2">In arrivo</h2>
        <p className="text-sm text-warm-500 max-w-md mx-auto">
          Le analitiche email saranno disponibili a breve. Potrai monitorare invii, aperture, click, bounce e molto altro per ogni campagna email.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-warm-400">
          <Clock size={14} /> Funzionalit&agrave; in fase di sviluppo
        </div>
      </div>
    </div>
  );
}
