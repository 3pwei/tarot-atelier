"use client";

import { useId, useState, type FormEvent } from "react";
import { countCharacters } from "@/domain/spread/spread";
import {
  missingBuiltIns,
  type SpreadTemplate,
  type TemplateLibrary,
} from "@/domain/spread/templates";
import { MAX_TEMPLATE_NAME_LENGTH } from "@/domain/spread/types";
import { SpreadPicker } from "@/presentation/components/spread/SpreadPicker";

interface TemplateShelfProps {
  readonly library: TemplateLibrary;
  readonly activeTemplateId?: string;
  /** Applying another layout is blocked once cards are on the table. */
  readonly applyLocked: boolean;
  readonly busy: boolean;
  readonly onApply: (templateId: string) => void;
  readonly onBlank: () => void;
  readonly onSave: (name: string) => void;
  readonly onDelete: (templateId: string) => void;
  readonly onRestore: () => void;
}

/** Built-in and saved spreads: apply, save the current one, or delete. */
export function TemplateShelf({
  library,
  activeTemplateId,
  applyLocked,
  busy,
  onApply,
  onBlank,
  onSave,
  onDelete,
  onRestore,
}: TemplateShelfProps) {
  const nameId = useId();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [deleting, setDeleting] = useState<SpreadTemplate>();
  const active = library.find((template) => template.id === activeTemplateId);
  const canRestore = missingBuiltIns(library).length > 0;
  const nameLength = countCharacters(name.trim());

  function startSaving() {
    // Saving again under a saved name updates that template.
    setName(active && !active.builtIn ? active.name : "");
    setSaving(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(name);
    if (nameLength > 0 && nameLength <= MAX_TEMPLATE_NAME_LENGTH) {
      setSaving(false);
    }
  }

  return (
    <section className="template-shelf" aria-label="牌陣庫">
      <SpreadPicker
        library={library}
        activeTemplateId={activeTemplateId}
        disabled={applyLocked || busy}
        onApply={onApply}
        renderChipAction={(template) => (
          <button
            type="button"
            className="template-chip__delete"
            aria-label={`刪除牌陣「${template.name}」`}
            disabled={busy}
            onClick={() => setDeleting(template)}
          >
            ×
          </button>
        )}
      >
        <button
          type="button"
          className="preset-chip"
          disabled={applyLocked || busy}
          onClick={onBlank}
        >
          空白牌桌
        </button>
      </SpreadPicker>

      {deleting && (
        <div
          className="spread-toolbar__confirm"
          role="group"
          aria-label="確認刪除牌陣"
        >
          <span>
            {deleting.builtIn
              ? `刪除「${deleting.name}」？之後可用「還原預設範例」找回。`
              : `刪除「${deleting.name}」？刪除後無法復原。`}
          </span>
          <button
            type="button"
            className="danger-action"
            onClick={() => {
              onDelete(deleting.id);
              setDeleting(undefined);
            }}
          >
            刪除
          </button>
          <button
            type="button"
            className="ghost-action"
            onClick={() => setDeleting(undefined)}
          >
            取消
          </button>
        </div>
      )}

      <div className="template-shelf__actions">
        {saving ? (
          <form className="template-shelf__save" onSubmit={submit}>
            <label className="sr-only" htmlFor={nameId}>
              牌陣名稱
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              placeholder="為這個牌陣命名"
              aria-describedby={`${nameId}-count`}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
            <small
              id={`${nameId}-count`}
              data-invalid={nameLength > MAX_TEMPLATE_NAME_LENGTH || undefined}
            >
              {nameLength} / {MAX_TEMPLATE_NAME_LENGTH}
            </small>
            <button type="submit" className="ghost-action ghost-action--gold">
              儲存
            </button>
            <button
              type="button"
              className="ghost-action"
              onClick={() => setSaving(false)}
            >
              取消
            </button>
          </form>
        ) : (
          <button
            type="button"
            className="ghost-action ghost-action--gold"
            disabled={busy}
            onClick={startSaving}
          >
            儲存目前牌陣
          </button>
        )}
        {canRestore && (
          <button
            type="button"
            className="ghost-action"
            disabled={busy}
            onClick={onRestore}
          >
            還原預設範例
          </button>
        )}
      </div>
    </section>
  );
}
