"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Designer {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
}

const BATCH = 8;

export default function DesignerGrid({ designers }: { designers: Designer[] }) {
  const [count, setCount] = useState(BATCH);
  const visible = designers.slice(0, count);
  const hasMore = count < designers.length;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
        {visible.map((designer) => (
          <Link
            key={designer.id}
            href={`/designers/${designer.slug}`}
            className="group block"
          >
            <div className="relative aspect-square bg-warm-100 overflow-hidden mb-3">
              {designer.imageUrl ? (
                <Image
                  src={designer.imageUrl}
                  alt={designer.name}
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                  sizes="(max-width: 768px) 45vw, 22vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-serif text-5xl text-warm-300">
                    {designer.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <p className="font-sans text-lg md:text-xl lg:text-2xl uppercase tracking-wide text-dark font-light">
              {designer.name}
            </p>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-10">
          <span
            onClick={() => setCount((prev) => prev + BATCH)}
            className="cursor-pointer uppercase text-sm tracking-[0.15em] font-light text-dark hover:underline underline-offset-4"
          >
            + Carica altri designer
          </span>
        </div>
      )}
    </>
  );
}
