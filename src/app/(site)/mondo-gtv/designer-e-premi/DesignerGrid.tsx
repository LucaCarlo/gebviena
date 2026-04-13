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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-14 md:gap-x-4 md:gap-y-20 px-2 md:px-3 lg:px-4">
        {visible.map((designer) => (
          <Link
            key={designer.id}
            href={`/designers/${designer.slug}`}
            className="group block"
          >
            <div className="relative bg-[#f6f6f6] overflow-hidden" style={{ aspectRatio: "4/5" }}>
              {designer.imageUrl ? (
                <Image
                  src={designer.imageUrl}
                  alt={designer.name}
                  fill
                  className="object-cover mix-blend-multiply grayscale group-hover:grayscale-0 transition-all duration-500"
                  sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="font-serif text-5xl text-warm-300">
                    {designer.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            <div className="mt-4">
              <h3 className="font-sans text-[28px] text-black leading-[1.15] font-light uppercase tracking-[inherit]">
                {designer.name}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-16">
          <button
            onClick={() => setCount((prev) => prev + BATCH)}
            className="inline-block uppercase text-[16px] tracking-[0.03em] !text-black font-medium transition-colors hover:text-accent hover:underline"
            style={{ textUnderlineOffset: "12px", textDecorationSkipInk: "none", textDecorationThickness: "0.5px" }}
          >
            <span className="mr-1">+</span> Carica altri designer
          </button>
        </div>
      )}
    </>
  );
}
