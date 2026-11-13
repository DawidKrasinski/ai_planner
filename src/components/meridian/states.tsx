"use client";

export function LoadingState({ label = "Wczytywanie…" }: { label?: string }) {
  return (
    <p className="meridian-state loading" role="status">
      {label}
    </p>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="meridian-state error" role="alert">
      <p>{message}</p>
      {onRetry ? (
        <button className="btn secondary" type="button" onClick={onRetry}>
          Spróbuj ponownie
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="meridian-state empty">{children}</p>;
}
