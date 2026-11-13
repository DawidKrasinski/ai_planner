"use client";

import { ErrorState } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState message={error.message || "Wystąpił błąd."} onRetry={reset} />;
}
