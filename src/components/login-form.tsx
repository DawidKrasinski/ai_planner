"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button, ErrorState, Field, fieldClass } from "@/components/ui";

export function LoginForm({ configured }: { configured: boolean }) {
  const t = useTranslations("login");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!email || !password) {
      setError(t("missing"));
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError(t("unconfigured"));
      return;
    }
    setPending(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError(t("failed"));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col justify-center px-4 py-10">
      <h1 className="serif text-4xl">{t("title")}</h1>
      <p className="mt-3 text-muted">{t("lead")}</p>
      {!configured ? <div className="mt-6"><ErrorState message={t("unconfigured")} /></div> : null}
      <form className="mt-6 grid gap-4" onSubmit={submit}>
        <Field label={t("email")}>
          <input className={fieldClass} type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label={t("password")}>
          <input className={fieldClass} type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <ErrorState message={error} /> : null}
        <Button type="submit" disabled={pending || !configured}>{pending ? t("pending") : t("submit")}</Button>
      </form>
    </main>
  );
}
