"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@streampix/shared";
import { apiFetch, apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AuthShell } from "@/components/shared/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuthStore();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      channelName: "",
      slug: "",
    },
  });

  async function onSubmit(values: RegisterInput) {
    try {
      await apiPost("/v1/auth/register", values);
      const session = await apiFetch<{
        user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;
        realtimeToken: string;
      }>("/v1/auth/me");
      setSession({ user: session.user, realtimeToken: session.realtimeToken });
      toast.success("Conta criada.");
      router.push("/dashboard/onboarding");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar conta.");
    }
  }

  return (
    <AuthShell
      title="Criar workspace StreamPix"
      description="Abra sua pagina publica, overlay premium e dashboard em um unico onboarding."
    >
      <form className="grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="space-y-2 text-sm text-white/70">
          Seu nome
          <Input {...form.register("name")} />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          E-mail
          <Input {...form.register("email")} />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Nome do canal
          <Input {...form.register("channelName")} />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Slug publico
          <Input {...form.register("slug")} placeholder="seu-canal" />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Senha
          <Input type="password" {...form.register("password")} />
        </label>
        <Button className="w-full" type="submit">
          Criar conta
        </Button>
      </form>
      <div className="mt-6 text-sm text-white/55">
        Ja tem conta? <Link href="/login">Entrar agora</Link>
      </div>
    </AuthShell>
  );
}
