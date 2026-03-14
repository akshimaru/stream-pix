import { DashboardShell } from "@/components/shared/dashboard-shell";
import { SessionGate } from "@/components/shared/session-gate";

export default function StreamerDashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate requiredRoles={["STREAMER", "SUPERADMIN"]} requireStreamerContext redirectTo="/admin">
      <DashboardShell>{children}</DashboardShell>
    </SessionGate>
  );
}
