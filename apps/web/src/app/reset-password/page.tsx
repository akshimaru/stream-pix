"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { resetPasswordSchema, type ResetPasswordInput } from "@streampix/shared";
import { apiPost } from "@/lib/api";
import { AuthShell } from "@/components/shared/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: "",
      password: "",
    },
  });

  async function onSubmit(values: ResetPasswordInput) {
    try {
      await apiPost("/v1/auth/reset-password", values);
      toast.success("Senha redefinida.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao redefinir senha.");
    }
  }

  return (
    <AuthShell title="Redefinir senha" description="Cole o token gerado pelo fluxo de recuperacao e escolha uma nova senha.">
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <label className="space-y-2 text-sm text-white/70">
          Token
          <Input {...form.register("token")} />
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Nova senha
          <Input type="password" {...form.register("password")} />
        </label>
        <Button type="submit" className="w-full">
          Atualizar senha
        </Button>
      </form>
    </AuthShell>
  );
}
