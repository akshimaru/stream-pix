"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@streampix/shared";
import { toast } from "sonner";
import { apiPost } from "@/lib/api";
import { AuthShell } from "@/components/shared/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [resetToken, setResetToken] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "demo@streampix.dev",
    },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    try {
      const response = await apiPost<{ message: string; resetToken?: string }>("/v1/auth/forgot-password", values);
      setResetToken(response.resetToken ?? null);
      toast.success(response.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar token.");
    }
  }

  return (
    <AuthShell title="Recuperar acesso" description="No ambiente local, o token de reset aparece na tela para acelerar testes.">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="space-y-2 text-sm text-white/70">
          E-mail
          <Input {...form.register("email")} />
        </label>
        <Button type="submit" className="w-full">
          Gerar token
        </Button>
      </form>
      {resetToken ? (
        <div className="mt-6 rounded-3xl border border-cyan-300/20 bg-cyan-300/10 p-4 text-sm text-cyan-100">
          Token local: <span className="break-all font-semibold">{resetToken}</span>
        </div>
      ) : null}
      <div className="mt-6 text-sm text-white/55">
        <Link href="/reset-password">Ja tenho um token</Link>
      </div>
    </AuthShell>
  );
}
