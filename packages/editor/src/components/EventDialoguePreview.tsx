import { resolveSpeakerLabel, type EventCommand, type Unit } from "@srpg/shared";
import { useMemo, useState } from "react";
import { flattenCommands, type CommandPath } from "../lib/events/eventCommandEditor.js";

interface DialoguePreviewRow {
  path: CommandPath;
  command: Extract<EventCommand, { cmd: "SHOW_MESSAGE" | "SHOW_CHOICES" }>;
}

export interface EventDialoguePreviewProps {
  commands: EventCommand[];
  units: Record<string, Unit>;
  selectedPath: CommandPath | null;
  onSelectPath: (path: CommandPath) => void;
}

function dialogueRows(commands: EventCommand[]): DialoguePreviewRow[] {
  return flattenCommands(commands)
    .filter((row) => row.command.cmd === "SHOW_MESSAGE" || row.command.cmd === "SHOW_CHOICES")
    .map((row) => ({
      path: row.path,
      command: row.command as DialoguePreviewRow["command"],
    }));
}

function faceInitial(label: string): string {
  return label.slice(0, 1) || "?";
}

export function EventDialoguePreview({
  commands,
  units,
  selectedPath,
  onSelectPath,
}: EventDialoguePreviewProps) {
  const rows = useMemo(() => dialogueRows(commands), [commands]);
  const [stepIndex, setStepIndex] = useState(0);

  const activeIndex = useMemo(() => {
    if (selectedPath) {
      const idx = rows.findIndex((row) => row.path === selectedPath);
      if (idx >= 0) return idx;
    }
    return Math.min(stepIndex, Math.max(rows.length - 1, 0));
  }, [rows, selectedPath, stepIndex]);

  const current = rows[activeIndex];

  if (rows.length === 0) {
    return (
      <aside className="dialogue-preview" data-testid="event-dialogue-preview">
        <h3>会話プレビュー</h3>
        <p className="hint">SHOW_MESSAGE / SHOW_CHOICES コマンドがありません。</p>
      </aside>
    );
  }

  const renderStage = () => {
    if (!current) return null;
    if (current.command.cmd === "SHOW_CHOICES") {
      return (
        <div className="dialogue-preview-choices" data-testid="dialogue-preview-stage">
          <p className="dialogue-preview-label">選択肢</p>
          <ul>
            {current.command.choices.map((choice) => (
              <li key={choice}>{choice}</li>
            ))}
          </ul>
        </div>
      );
    }

    const speakerName = resolveSpeakerLabel(current.command.speakerId, units);
    const faceLabel = speakerName || current.command.faceId || "";
    return (
      <div className="dialogue-preview-message" data-testid="dialogue-preview-stage">
        <div className="dialogue-preview-face" aria-hidden="true">
          {faceLabel ? faceInitial(faceLabel) : ""}
        </div>
        <div className="dialogue-preview-body">
          {speakerName ? <div className="dialogue-preview-speaker">{speakerName}</div> : null}
          <div className="dialogue-preview-text">{current.command.text}</div>
        </div>
      </div>
    );
  };

  return (
    <aside className="dialogue-preview" data-testid="event-dialogue-preview">
      <h3>会話プレビュー</h3>
      <div className="dialogue-preview-nav">
        <button
          type="button"
          disabled={activeIndex <= 0}
          onClick={() => {
            const next = Math.max(0, activeIndex - 1);
            setStepIndex(next);
            onSelectPath(rows[next]!.path);
          }}
          data-testid="dialogue-preview-prev"
        >
          前へ
        </button>
        <span data-testid="dialogue-preview-counter">
          {activeIndex + 1} / {rows.length}
        </span>
        <button
          type="button"
          disabled={activeIndex >= rows.length - 1}
          onClick={() => {
            const next = Math.min(rows.length - 1, activeIndex + 1);
            setStepIndex(next);
            onSelectPath(rows[next]!.path);
          }}
          data-testid="dialogue-preview-next"
        >
          次へ
        </button>
      </div>
      {renderStage()}
      <ol className="dialogue-preview-steps">
        {rows.map((row, index) => (
          <li key={row.path}>
            <button
              type="button"
              className={index === activeIndex ? "active" : ""}
              onClick={() => {
                setStepIndex(index);
                onSelectPath(row.path);
              }}
              data-testid={`dialogue-preview-step-${row.path}`}
            >
              {row.command.cmd === "SHOW_MESSAGE"
                ? resolveSpeakerLabel(row.command.speakerId, units) || "（ナレーション）"
                : `選択: ${row.command.choices.join(" / ")}`}
            </button>
          </li>
        ))}
      </ol>
    </aside>
  );
}
