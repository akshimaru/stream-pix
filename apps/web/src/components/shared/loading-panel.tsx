export function LoadingPanel({ label = "Carregando workspace..." }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="mx-auto h-14 w-14 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300" />
        <p className="text-sm uppercase tracking-[0.3em] text-white/50">{label}</p>
      </div>
    </div>
  );
}
