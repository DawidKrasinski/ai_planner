"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";
import { Icon } from "./icon";
import { ErrorState, LoadingState } from "./states";

type Proposal =
  | { type: "none" }
  | { type: "clarification"; questions: string[] }
  | {
      type: "goal_draft";
      draft: {
        name: string;
        description: string;
        category: "training" | "learning_work" | "leisure";
        manualPriority: number;
        difficulty: number;
        difficultyIsEstimate: boolean;
        progressMethod: string;
        currentLevel: string | null;
        desiredLevel: string | null;
        deadlineAt: string | null;
        planningNotes: string;
      };
    }
  | { type: "event_draft"; title: string; startAt: string; endAt: string; isFixed: boolean };

type ChatMessage = { from: "ai" | "user"; text: string };

const screenLabels: Record<string, string> = {
  dashboard: "pulpit i dzisiejszy plan",
  calendar: "kalendarz",
  goals: "cele",
  statistics: "statystyki",
  settings: "ustawienia",
  history: "historię zmian",
};

export function AssistantPanel({
  screen,
  onClose,
}: {
  screen: "dashboard" | "calendar" | "goals" | "statistics" | "settings" | "history";
  onClose: () => void;
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      from: "ai",
      text: "Cześć. Widzę Twój aktualny kontekst. W czym mogę pomóc?",
    },
  ]);
  const [proposal, setProposal] = useState<Proposal>({ type: "none" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mock, setMock] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  async function send(raw?: string) {
    const message = (raw ?? text).trim();
    if (!message || pending) {
      return;
    }
    setText("");
    setPending(true);
    setError(null);
    setSaved(null);
    setMessages((current) => [...current, { from: "user", text: message }]);
    try {
      const data = await clientApi<{ reply: string; proposal: Proposal; mock: boolean }>(
        "/api/assistant/messages",
        {
          method: "POST",
          body: JSON.stringify({ message, screen }),
        },
      );
      setMessages((current) => [...current, { from: "ai", text: data.reply }]);
      setProposal(data.proposal ?? { type: "none" });
      setMock(data.mock);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Asystent jest niedostępny.");
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
      const draft = proposal.draft;
      await clientApi("/api/goals", {
        method: "POST",
        body: JSON.stringify({
          name: draft.name,
          description: draft.description,
          category: draft.category,
          manualPriority: draft.manualPriority,
          difficulty: draft.difficulty,
          difficultyIsEstimate: draft.difficultyIsEstimate,
          progressMethod: draft.progressMethod,
          currentLevel: draft.currentLevel,
          desiredLevel: draft.desiredLevel,
          deadlineAt: draft.deadlineAt,
          planningNotes: draft.planningNotes,
        }),
      });
      setSaved("Cel został zapisany.");
      setProposal({ type: "none" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć celu.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="assistant-backdrop" onClick={onClose} role="presentation">
      <aside
        className="assistant-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-label="Asystent AI"
      >
        <div className="assistant-head">
          <div>
            <span className="ai-orb">
              <Icon name="sparkles" />
            </span>
            <span>
              <strong>Asystent AI</strong>
              <small>
                <i /> {mock ? "Adapter lokalny (mock)" : "Aktywny"}
              </small>
            </span>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Zamknij">
            <Icon name="x" />
          </button>
        </div>
        <div className="context-pill">
          <Icon name="home" size={14} /> Kontekst: {screenLabels[screen] ?? screen}
        </div>
        {error ? <ErrorState message={error} onRetry={() => setError(null)} /> : null}
        {pending ? <LoadingState label="Asystent odpowiada…" /> : null}
        <div className="messages">
          {messages.map((message, index) => (
            <div className={`message ${message.from}`} key={`${message.from}-${index}`}>
              {message.from === "ai" ? (
                <span className="ai-orb small">
                  <Icon name="sparkles" size={13} />
                </span>
              ) : null}
              <p>{message.text}</p>
            </div>
          ))}
        </div>
        {proposal.type === "clarification" ? (
          <ul className="suggestions">
            {proposal.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        ) : null}
        {proposal.type === "goal_draft" ? (
          <div className="provider-card" style={{ margin: "0 16px 12px" }}>
            <div>
              <strong>{proposal.draft.name}</strong>
              <small>
                {proposal.draft.category} · P{proposal.draft.manualPriority} · trudność{" "}
                {proposal.draft.difficulty}
              </small>
            </div>
            <button className="btn primary" type="button" disabled={pending} onClick={confirmGoal}>
              Utwórz cel
            </button>
          </div>
        ) : null}
        {saved ? <p className="meridian-state empty">{saved}</p> : null}
        {messages.length === 1 && !pending ? (
          <div className="suggestions">
            <span>SPRÓBUJ ZAPYTAĆ</span>
            {[
              "Jak wygląda mój tydzień?",
              "Przesuń trening na wieczór",
              "Który cel rozwija się najwolniej?",
            ].map((suggestion) => (
              <button type="button" onClick={() => setText(suggestion)} key={suggestion}>
                {suggestion}
                <Icon name="chevronRight" size={14} />
              </button>
            ))}
          </div>
        ) : null}
        <div className="assistant-input">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
            placeholder="Napisz, co chcesz zrobić..."
            rows={2}
            disabled={pending}
          />
          <button type="button" onClick={() => void send()} aria-label="Wyślij" disabled={pending}>
            <Icon name="send" size={17} />
          </button>
          <small>Enter, aby wysłać · AI może popełniać błędy</small>
        </div>
      </aside>
    </div>
  );
}
