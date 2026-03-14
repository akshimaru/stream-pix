"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { loginSchema, type LoginInput } from "@streampix/shared";
import { apiFetch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AuthShell } from "@/components/shared/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "demo@streampix.dev",
      password: "Demo123!",
    },
  });

  async function onSubmit(values: LoginInput) {
    try {
      await apiPost("/v1/auth/login", values);
      const session = await apiFetch<{
        user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;
        realtimeToken: string;
      }>("/v1/auth/me");
      setSession({ user: session.user, realtimeToken: session.realtimeToken });
      toast.success("Login realizado.");

      const isAdminOnly =
        (session.user.roles.includes("SUPERADMIN") || session.user.roles.includes("INTERNAL_ADMIN")) &&
        !session.user.streamerId;

      router.push(isAdminOnly ? "/admin" : "/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha no login.");
    }
  }

  return (
    <AuthShell title="Entrar no workspace" description="Acesse seu painel de streamer ou a operacao superadmin.">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="space-y-2 text-sm text-white/70">
          E-mail
          <Input {...form.register("email")} />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Senha
          <Input type="password" {...form.register("password")} />
        </label>
        <Button className="w-full" type="submit">
          Entrar
        </Button>
      </form>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm text-white/55">
        <Link href="/forgot-password">Esqueci a senha</Link>
        <Link href="/register">Criar conta</Link>
      </div>
    </AuthShell>
  );
}
