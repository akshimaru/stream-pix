"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { LoadingPanel } from "./loading-panel";
import { useAuthStore } from "@/store/auth-store";

export function SessionGate({
  children,
  requiredRoles,
  requireStreamerContext = false,
  redirectTo,
}: {
  children: React.ReactNode;
  requiredRoles?: string[];
  requireStreamerContext?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const { user, initialized, setSession, clearSession, loading, setLoading } = useAuthStore();

  function resolveFallbackRoute() {
    if (redirectTo) {
      return redirectTo;
    }

    if (user?.roles.includes("SUPERADMIN") || user?.roles.includes("INTERNAL_ADMIN")) {
      return "/admin";
    }

    if (user?.streamerId) {
      return "/dashboard";
    }

    return "/login";
  }

  useEffect(() => {
    let active = true;

    setLoading(true);
    apiFetch<{ user: typeof user; realtimeToken: string }>("/v1/auth/me")
      .then((data) => {
        if (active && data.user) {
          setSession({ user: data.user, realtimeToken: data.realtimeToken });
        }
      })
      .catch(() => {
        if (active) {
          clearSession();
          router.replace("/login");
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [setSession, clearSession, router, setLoading]);

  useEffect(() => {
    if (!initialized || !user || !requiredRoles?.length) {
      if (!initialized || !user || !requireStreamerContext) {
        return;
      }
    }

    if (requireStreamerContext && !user.streamerId) {
      router.replace(resolveFallbackRoute());
      return;
    }

    if (!requiredRoles?.length) {
      return;
    }

    const allowed = requiredRoles.some((role) => user.roles.includes(role as never));

    if (!allowed) {
      router.replace(resolveFallbackRoute());
    }
  }, [initialized, redirectTo, requireStreamerContext, requiredRoles, router, user]);

  const hasRequiredRole = requiredRoles?.length ? requiredRoles.some((role) => user?.roles.includes(role as never)) : true;
  const hasStreamerContext = requireStreamerContext ? Boolean(user?.streamerId) : true;

  if (!initialized || loading || !user || !hasRequiredRole || !hasStreamerContext) {
    return <LoadingPanel />;
  }

  return <>{children}</>;
}
