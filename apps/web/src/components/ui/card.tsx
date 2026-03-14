import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,48,0.95),rgba(8,12,27,0.96))] p-6 shadow-neon backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}
