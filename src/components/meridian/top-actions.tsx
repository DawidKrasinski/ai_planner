"use client";

import { Icon } from "./icon";

export function TopActions({ onAdd, openAI }: { onAdd: () => void; openAI: () => void }) {
  return (
    <div className="top-actions">
      <button className="icon-btn hide-mobile" aria-label="Szukaj" type="button">
        <Icon name="search" />
      </button>
      <button className="icon-btn hide-mobile has-dot" aria-label="Powiadomienia" type="button">
        <Icon name="bell" />
      </button>
      <button className="btn secondary compact-ai" type="button" onClick={openAI}>
        <Icon name="sparkles" size={16} /> Zapytaj AI
      </button>
      <button className="btn primary" type="button" onClick={onAdd}>
        <Icon name="plus" size={17} />
        <span>Dodaj</span>
      </button>
    </div>
  );
}
