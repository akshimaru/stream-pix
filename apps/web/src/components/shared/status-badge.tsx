import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const palette: Record<string, string> = {
  PAID: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  PENDING: "border-amber-400/30 bg-amber-400/15 text-amber-200",
  PENDING_APPROVAL: "border-amber-400/30 bg-amber-400/15 text-amber-200",
  BLOCKED: "border-rose-400/30 bg-rose-400/15 text-rose-200",
  PROCESSING: "border-sky-400/30 bg-sky-400/15 text-sky-200",
  DISPLAYED: "border-fuchsia-400/30 bg-fuchsia-400/15 text-fuchsia-200",
  SPOKEN: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
  ACTIVE: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  TRIALING: "border-sky-400/30 bg-sky-400/15 text-sky-200",
  CANCELED: "border-rose-400/30 bg-rose-400/15 text-rose-200",
  REJECTED: "border-rose-400/30 bg-rose-400/15 text-rose-200",
  FAILED: "border-rose-400/30 bg-rose-400/15 text-rose-200",
  SUSPENDED: "border-amber-400/30 bg-amber-400/15 text-amber-200",
  PIX_CREDIT: "border-emerald-400/30 bg-emerald-400/15 text-emerald-200",
  PAYOUT_REQUEST: "border-amber-400/30 bg-amber-400/15 text-amber-200",
  PAYOUT_COMPLETED: "border-cyan-400/30 bg-cyan-400/15 text-cyan-200",
};

export function StatusBadge({ value }: { value: string }) {
  return <Badge className={cn("tracking-[0.18em]", palette[value] ?? "text-white/70")}>{value}</Badge>;
}
