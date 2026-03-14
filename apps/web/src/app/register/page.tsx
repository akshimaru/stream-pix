"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@streampix/shared";
import { apiPost } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { AuthShell } from "@/components/shared/auth-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type AuthResponse = {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>["user"]>;
  realtimeToken: string;
};

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
      const session = await apiPost<AuthResponse>("/v1/auth/register", values);
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
          {form.formState.errors.name ? <p className="text-xs text-rose-300">{form.formState.errors.name.message}</p> : null}
        </label>
        <label className="space-y-2 text-sm text-white/70">
          E-mail
          <Input type="email" autoComplete="email" {...form.register("email")} />
          {form.formState.errors.email ? <p className="text-xs text-rose-300">{form.formState.errors.email.message}</p> : null}
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Nome do canal
          <Input {...form.register("channelName")} />
          {form.formState.errors.channelName ? <p className="text-xs text-rose-300">{form.formState.errors.channelName.message}</p> : null}
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Slug publico
          <Input
            {...form.register("slug")}
            placeholder="seu-canal"
            onBlur={(event) => {
              const normalizedSlug = event.target.value
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9-]+/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/^-|-$/g, "");
              form.setValue("slug", normalizedSlug, { shouldDirty: true, shouldValidate: true });
            }}
          />
          <p className="text-xs text-white/35">Use apenas letras minusculas, numeros e hifens.</p>
          {form.formState.errors.slug ? <p className="text-xs text-rose-300">{form.formState.errors.slug.message}</p> : null}
        </label>
        <label className="space-y-2 text-sm text-white/70">
          Senha
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
          <p className="text-xs text-white/35">Minimo de 8 caracteres, com 1 letra maiuscula e 1 numero.</p>
          {form.formState.errors.password ? <p className="text-xs text-rose-300">{form.formState.errors.password.message}</p> : null}
        </label>
        <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
      <div className="mt-6 text-sm text-white/55">
        Ja tem conta? <Link href="/login">Entrar agora</Link>
      </div>
    </AuthShell>
  );
}
