"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Receipt, Sparkles, SlidersHorizontal, Shield, Radio, Wallet } from "lucide-react";
import { Logo } from "./logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { apiPost } from "@/lib/api";

const streamerLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/payments", label: "Pagamentos", icon: Receipt },
  { href: "/dashboard/payouts", label: "Repasses", icon: Wallet },
  { href: "/dashboard/alerts", label: "Alertas", icon: Radio },
  { href: "/dashboard/overlay", label: "Overlay", icon: Sparkles },
  { href: "/dashboard/settings", label: "Configuracoes", icon: SlidersHorizontal },
];

const adminLinks = [{ href: "/admin", label: "Superadmin", icon: Shield }];

export function DashboardShell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, clearSession } = useAuthStore();

  const links = isAdmin ? adminLinks : streamerLinks;

  async function handleLogout() {
    await apiPost("/v1/auth/logout");
    clearSession();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-white/6 bg-black/20 p-5 backdrop-blur lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r">
          <Logo href={isAdmin ? "/admin" : "/dashboard"} />
          <div className="mt-10 space-y-2">
            {links.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-white/60 transition",
                    pathname === item.href
                      ? "border-cyan-300/20 bg-white/8 text-white shadow-neon"
                      : "hover:border-white/10 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.28em] text-white/45">Sessao</p>
            <p className="mt-3 text-lg font-semibold text-white">{user?.streamerDisplayName ?? user?.name}</p>
            <p className="text-sm text-white/45">{user?.email}</p>
            <Button className="mt-4 w-full" variant="secondary" onClick={handleLogout}>
              Sair
            </Button>
          </div>
        </aside>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
