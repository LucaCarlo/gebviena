"use client";

import { Hourglass } from "lucide-react";

export default function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 text-amber-700 mb-3">
        <Hourglass size={20} />
      </div>
      <h3 className="text-lg font-medium text-warm-800 mb-2">{title}</h3>
      <p className="text-sm text-warm-600 max-w-md mx-auto">{description}</p>
    </div>
  );
}
