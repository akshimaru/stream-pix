import { Badge } from "@/components/ui/badge";

export function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="space-y-3">
      {eyebrow ? <Badge>{eyebrow}</Badge> : null}
      <h2 className="font-[var(--font-orbitron)] text-3xl font-black text-white sm:text-4xl">{title}</h2>
      {description ? <p className="max-w-2xl text-base text-white/60">{description}</p> : null}
    </div>
  );
}
