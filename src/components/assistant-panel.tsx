"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, ErrorState, fieldClass } from "@/components/ui";

type Proposal =
  | { type: "none" }
  | { type: "clarification"; questions: string[] }
  | { type: "goal_draft"; draft: { name: string; description: string; category: "training" | "learning_work" | "leisure"; manualPriority: number; difficulty: number; difficultyIsEstimate: boolean; progressMethod: string; currentLevel: string | null; desiredLevel: string | null; deadlineAt: string | null; planningNotes: string } }
  | { type: "event_draft"; title: string; startAt: string; endAt: string; isFixed: boolean };

export function AssistantPanel({ screen, onClose }: { screen: string; onClose: () => void }) {
  const t = useTranslations("assistant");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [proposal, setProposal] = useState<Proposal>({ type: "none" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  async function send() {
    setPending(true);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch("/api/assistant/messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, screen }),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readError(body) ?? t("unavailable"));
        return;
      }
      const data = (body as { data: { reply: string; proposal: Proposal; mock: boolean } }).data;
      setReply(data.reply);
      setProposal(data.proposal);
      setMock(data.mock);
    } catch {
      setError(t("unavailable"));
    } finally {
      setPending(false);
    }
  }

  async function confirmGoal() {
    if (proposal.type !== "goal_draft") {
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/goals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(proposal.draft),
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setError(readError(body) ?? "Nie udało się utworzyć celu.");
        return;
      }
      setSaved("Cel został zapisany.");
      setProposal({ type: "none" });
    } catch {
      setError("Nie udało się utworzyć celu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-20 bg-ink/30" role="presentation">
      <section className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-3xl bg-paper p-4 shadow-xl md:inset-y-4 md:right-4 md:left-auto md:w-96 md:rounded-3xl" role="dialog" aria-label={t("title")}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="serif text-xl">{t("title")}</h2>
          <button className="min-h-11 px-3" type="button" onClick={onClose}>Zamknij</button>
        </div>
        {mock ? <p className="mb-3 text-sm text-muted">{t("mock")}</p> : null}
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
        {reply ? <p className="mb-3 rounded-2xl bg-card p-3 text-sm">{reply}</p> : <p className="mb-3 text-sm text-muted">Rozmowa zaczyna się od Twojej wiadomości.</p>}
        {proposal.type === "clarification" ? (
          <ul className="mb-3 list-disc pl-5 text-sm">{proposal.questions.map((question) => <li key={question}>{question}</li>)}</ul>
        ) : null}
        {proposal.type === "goal_draft" ? (
          <div className="mb-3 rounded-2xl border border-line bg-card p-3 text-sm">
            <p className="font-semibold">{proposal.draft.name}</p>
            <p>{proposal.draft.category} · priorytet {proposal.draft.manualPriority} · trudność {proposal.draft.difficulty}{proposal.draft.difficultyIsEstimate ? " (szacunek)" : ""}</p>
            <Button className="mt-3" type="button" disabled={pending} onClick={confirmGoal}>{t("confirmGoal")}</Button>
          </div>
        ) : null}
        {saved ? <p className="mb-3 text-sm text-accent">{saved}</p> : null}
        <textarea className={`${fieldClass} min-h-24`} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t("placeholder")} />
        <Button className="mt-3 w-full" type="button" disabled={pending || message.trim().length === 0} onClick={send}>
          {pending ? "Wysyłanie…" : t("send")}
        </Button>
      </section>
    </div>
  );
}

function readError(body: unknown): string | null {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return null;
  }
  const error = body.error;
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") {
    return null;
  }
  return error.message;
}
