import {
  EventCommandSchema,
  EventDefinitionSchema,
  EventTriggerSchema,
  type EventCommand,
  type EventDefinition,
  type EventTrigger,
} from "@srpg/shared";
import { useMemo, useState } from "react";
import { SchemaForm, buildIdOptions } from "../schema-form/index.js";
import {
  COMMAND_TYPES,
  addBranchSectionCommand,
  addCommandAtPath,
  flattenCommands,
  moveCommandAtPath,
  removeCommandAtPath,
  setCommandAtPath,
  type CommandPath,
  type CommandType,
} from "../lib/events/eventCommandEditor.js";
import { useProjectStore } from "../store/projectStore.js";
import { EventDialoguePreview } from "./EventDialoguePreview.js";

function defaultEvent(id: string): EventDefinition {
  return EventDefinitionSchema.parse({
    id,
    name: "新規イベント",
    trigger: { type: "chapterStart" },
    commands: [],
  });
}

export function EventEditorTab() {
  const project = useProjectStore((s) => s.project);
  const selectedEventId = useProjectStore((s) => s.selectedEventId);
  const selectEvent = useProjectStore((s) => s.selectEvent);
  const addEvent = useProjectStore((s) => s.addEvent);
  const deleteEvent = useProjectStore((s) => s.deleteEvent);
  const updateEvent = useProjectStore((s) => s.updateEvent);

  const [selectedCommandPath, setSelectedCommandPath] = useState<CommandPath | null>(null);
  const [addCmdType, setAddCmdType] = useState<CommandType>("SHOW_MESSAGE");

  const events = project?.events ?? {};
  const eventIds = Object.keys(events);
  const selected = selectedEventId ? events[selectedEventId] : null;

  const commandRows = useMemo(
    () => (selected ? flattenCommands(selected.commands) : []),
    [selected],
  );

  const selectedCommand =
    selected && selectedCommandPath
      ? commandRows.find((row) => row.path === selectedCommandPath)?.command ?? null
      : null;

  const formContext = useMemo(
    () => ({
      idOptions: project ? buildIdOptions(project.database) : {},
    }),
    [project],
  );

  if (!project) {
    return <p data-testid="events-tab">プロジェクトを読み込んでください。</p>;
  }

  const handleAddEvent = () => {
    const id = `event_${eventIds.length + 1}`;
    addEvent(id, defaultEvent(id));
    setSelectedCommandPath(null);
  };

  const patchCommands = (nextCommands: EventDefinition["commands"]) => {
    if (!selectedEventId || !selected) return;
    updateEvent(selectedEventId, { ...selected, commands: nextCommands });
  };

  const handleAddCommand = (parentPath: CommandPath = "") => {
    patchCommands(addCommandAtPath(selected?.commands ?? [], parentPath, addCmdType));
  };

  const handleAddBranchCommand = (branchPath: CommandPath, section: "then" | "else") => {
    patchCommands(addBranchSectionCommand(selected?.commands ?? [], branchPath, section, addCmdType));
  };

  return (
    <section className="panel events-panel" data-testid="events-tab">
      <div className="events-layout">
        <aside className="events-list">
          <button type="button" onClick={handleAddEvent} data-testid="event-add">
            追加
          </button>
          <ul>
            {eventIds.map((id) => (
              <li key={id}>
                <button
                  type="button"
                  className={selectedEventId === id ? "active" : ""}
                  onClick={() => {
                    selectEvent(id);
                    setSelectedCommandPath(null);
                  }}
                  data-testid={`event-entry-${id}`}
                >
                  {events[id]?.name ?? id}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="events-detail">
          {selected && selectedEventId ? (
            <div className="events-editor-grid">
              <div className="events-editor-main">
                <div className="events-toolbar">
                  <label>
                    名前
                    <input
                      type="text"
                      value={selected.name ?? ""}
                      onChange={(e) =>
                        updateEvent(selectedEventId, { ...selected, name: e.target.value })
                      }
                      data-testid="event-name"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      deleteEvent(selectedEventId);
                      setSelectedCommandPath(null);
                    }}
                    data-testid="event-delete"
                  >
                    削除
                  </button>
                </div>

                <fieldset className="schema-fieldset" data-testid="event-trigger">
                  <legend>トリガー</legend>
                  <SchemaForm<EventTrigger>
                    schema={EventTriggerSchema as unknown as import("zod").ZodType<EventTrigger>}
                    value={selected.trigger}
                    onChange={(trigger) => updateEvent(selectedEventId, { ...selected, trigger })}
                    context={formContext}
                  />
                </fieldset>

                <div className="command-editor" data-testid="event-commands">
                  <h3>コマンド</h3>
                  <div className="command-add-bar">
                    <select
                      value={addCmdType}
                      onChange={(e) => setAddCmdType(e.target.value as CommandType)}
                      data-testid="event-cmd-type"
                      aria-label="追加するコマンド種別"
                    >
                      {COMMAND_TYPES.map((cmd) => (
                        <option key={cmd} value={cmd}>
                          {cmd}
                        </option>
                      ))}
                    </select>
                    <button type="button" onClick={() => handleAddCommand()} data-testid="event-cmd-add">
                      ルートに追加
                    </button>
                  </div>

                  <ol className="command-list">
                    {commandRows.map((row) => (
                      <li
                        key={row.path}
                        className={selectedCommandPath === row.path ? "active" : ""}
                        style={{ marginLeft: `${row.depth * 1.25}rem` }}
                        data-testid={`event-cmd-row-${row.path}`}
                      >
                        <button
                          type="button"
                          className="cmd-select"
                          onClick={() => setSelectedCommandPath(row.path)}
                          data-testid={`event-cmd-select-${row.path}`}
                        >
                          {row.section ? `[${row.section}] ` : ""}
                          {row.command.cmd}
                        </button>
                        <span className="cmd-actions">
                          <button
                            type="button"
                            aria-label="上へ"
                            onClick={() => patchCommands(moveCommandAtPath(selected.commands, row.path, "up"))}
                            data-testid={`event-cmd-up-${row.path}`}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-label="下へ"
                            onClick={() =>
                              patchCommands(moveCommandAtPath(selected.commands, row.path, "down"))
                            }
                            data-testid={`event-cmd-down-${row.path}`}
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            aria-label="削除"
                            onClick={() => {
                              patchCommands(removeCommandAtPath(selected.commands, row.path));
                              if (selectedCommandPath === row.path) setSelectedCommandPath(null);
                            }}
                            data-testid={`event-cmd-remove-${row.path}`}
                          >
                            ×
                          </button>
                          {row.command.cmd === "BRANCH" ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAddBranchCommand(row.path, "then")}
                                data-testid={`event-cmd-add-then-${row.path}`}
                              >
                                +then
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAddBranchCommand(row.path, "else")}
                                data-testid={`event-cmd-add-else-${row.path}`}
                              >
                                +else
                              </button>
                            </>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ol>

                  {selectedCommand ? (
                    <fieldset className="schema-fieldset" data-testid="event-cmd-detail">
                      <legend>{selectedCommand.cmd}</legend>
                      <SchemaForm<EventCommand>
                        schema={EventCommandSchema as import("zod").ZodType<EventCommand>}
                        value={selectedCommand}
                        onChange={(cmd) => {
                          if (!selectedCommandPath) return;
                          patchCommands(setCommandAtPath(selected.commands, selectedCommandPath, cmd));
                        }}
                        context={formContext}
                      />
                    </fieldset>
                  ) : (
                    <p className="hint">コマンドを選択するとパラメータを編集できます。</p>
                  )}
                </div>
              </div>

              <EventDialoguePreview
                commands={selected.commands}
                units={project.database.units}
                selectedPath={selectedCommandPath}
                onSelectPath={setSelectedCommandPath}
              />
            </div>
          ) : (
            <p>左のリストからイベントを選択するか、追加してください。</p>
          )}
        </div>
      </div>
    </section>
  );
}
