import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-accent to-secondary shadow-neon">
        <span className="text-lg font-black text-white">SP</span>
      </span>
      <span>
        <span className="block text-lg font-black tracking-[0.22em] text-white">STREAMPIX</span>
        <span className="block text-xs uppercase tracking-[0.38em] text-cyan-200/70">
          Pix voice alerts
        </span>
      </span>
    </Link>
  );
}
