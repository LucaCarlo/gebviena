import Image from "next/image";
import Link from "next/link";

export default function Logo({ className = "", width = 80, height = 66 }: { className?: string; width?: number; height?: number }) {
  return (
    <Link href="/" className={className}>
      <Image src="/logo.webp" alt="Wiener GTV Design" width={width} height={height} priority />
    </Link>
  );
}
