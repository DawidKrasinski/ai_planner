import { cn } from "@/lib/utils";

export function Button({
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-4 text-sm font-semibold text-white disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

export const fieldClass =
  "min-h-11 w-full rounded-xl border border-line bg-card px-3 text-base text-ink";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-card p-4 text-sm text-muted">{children}</p>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-white p-4 text-sm" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button className="mt-3 min-h-11 underline" onClick={onRetry} type="button">
          Spróbuj ponownie
        </button>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Wczytywanie…" }: { label?: string }) {
  return <p className="text-sm text-muted" role="status">{label}</p>;
}
