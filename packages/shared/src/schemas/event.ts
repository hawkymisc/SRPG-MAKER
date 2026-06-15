import { z } from "zod";
import {
  BgmIdSchema,
  ChapterIdSchema,
  EventIdSchema,
  FaceIdSchema,
  SeIdSchema,
  SwitchIdSchema,
  UnitIdSchema,
  VariableIdSchema,
} from "./ids.js";
import { FactionSchema, AiTypeSchema, LoseConditionSchema, WinConditionSchema } from "./map.js";

/** BRANCH のネスト最大深度(docs/event-commands.md で凍結)。 */
export const MAX_BRANCH_DEPTH = 5;

const coord = z.number().int().nonnegative();

// --- BRANCH の条件(変数 / スイッチ / ユニット生存) ---------------------------

export const VariableConditionOpSchema = z.enum(["==", "!=", ">", ">=", "<", "<="]);

export const EventConditionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("variable"),
    varId: VariableIdSchema,
    op: VariableConditionOpSchema,
    value: z.number().int(),
  }),
  z.object({
    type: z.literal("switch"),
    switchId: SwitchIdSchema,
    value: z.boolean(),
  }),
  z.object({
    type: z.literal("unit_alive"),
    unitId: UnitIdSchema,
    alive: z.boolean().default(true),
  }),
]);

export type EventCondition = z.infer<typeof EventConditionSchema>;

// --- 15 コマンドのうち、再帰しない 14 種 -------------------------------------

export const ShowMessageCommandSchema = z.object({
  cmd: z.literal("SHOW_MESSAGE"),
  speakerId: UnitIdSchema.optional(),
  faceId: FaceIdSchema.optional(),
  text: z.string(),
});

export const ShowChoicesCommandSchema = z.object({
  cmd: z.literal("SHOW_CHOICES"),
  choices: z.array(z.string().min(1)).min(2).max(6),
  resultVar: VariableIdSchema,
});

export const SetVariableCommandSchema = z.object({
  cmd: z.literal("SET_VARIABLE"),
  varId: VariableIdSchema,
  op: z.enum(["=", "+", "-", "*"]),
  operand: z.union([
    z.object({ value: z.number().int() }),
    z.object({ varRef: VariableIdSchema }),
  ]),
});

export const SetSwitchCommandSchema = z.object({
  cmd: z.literal("SET_SWITCH"),
  switchId: SwitchIdSchema,
  value: z.enum(["on", "off", "toggle"]),
});

export const SpawnUnitCommandSchema = z.object({
  cmd: z.literal("SPAWN_UNIT"),
  unitId: UnitIdSchema,
  x: coord,
  y: coord,
  faction: FactionSchema,
  aiType: AiTypeSchema.optional(),
});

export const RemoveUnitCommandSchema = z.object({
  cmd: z.literal("REMOVE_UNIT"),
  unitId: UnitIdSchema,
  effect: z.enum(["fade", "warp", "none"]).default("none"),
});

export const MoveUnitCommandSchema = z.object({
  cmd: z.literal("MOVE_UNIT"),
  unitId: UnitIdSchema,
  x: coord,
  y: coord,
  speed: z.number().positive().default(1),
});

export const CameraFocusCommandSchema = z.object({
  cmd: z.literal("CAMERA_FOCUS"),
  target: z.union([
    z.object({ x: coord, y: coord }),
    z.object({ unitId: UnitIdSchema }),
  ]),
  durationMs: z.number().int().nonnegative().default(0),
});

export const PlayBgmCommandSchema = z.object({
  cmd: z.literal("PLAY_BGM"),
  bgmId: BgmIdSchema,
  fadeInMs: z.number().int().nonnegative().optional(),
});

export const PlaySeCommandSchema = z.object({
  cmd: z.literal("PLAY_SE"),
  seId: SeIdSchema,
});

export const ScreenEffectCommandSchema = z.object({
  cmd: z.literal("SCREEN_EFFECT"),
  effect: z.discriminatedUnion("type", [
    z.object({ type: z.literal("fadeIn"), durationMs: z.number().int().nonnegative().default(0) }),
    z.object({ type: z.literal("fadeOut"), durationMs: z.number().int().nonnegative().default(0) }),
    z.object({
      type: z.literal("shake"),
      power: z.number().nonnegative().default(1),
      durationMs: z.number().int().nonnegative().default(0),
    }),
    z.object({
      type: z.literal("tint"),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      durationMs: z.number().int().nonnegative().default(0),
    }),
  ]),
});

export const ChangeObjectiveCommandSchema = z.object({
  cmd: z.literal("CHANGE_OBJECTIVE"),
  win: WinConditionSchema.optional(),
  lose: LoseConditionSchema.optional(),
});

export const WaitCommandSchema = z.object({
  cmd: z.literal("WAIT"),
  ms: z.number().int().nonnegative(),
});

export const GotoChapterCommandSchema = z.object({
  cmd: z.literal("GOTO_CHAPTER"),
  chapterId: ChapterIdSchema,
});

// --- 再帰する BRANCH コマンドと、全コマンドの判別共用体 -------------------------

/** BRANCH は then / else に EventCommand 配列を再帰的に含む。 */
export type BranchCommand = {
  cmd: "BRANCH";
  condition: EventCondition;
  then: EventCommand[];
  else?: EventCommand[] | undefined;
};

export type EventCommand =
  | z.infer<typeof ShowMessageCommandSchema>
  | z.infer<typeof ShowChoicesCommandSchema>
  | z.infer<typeof SetVariableCommandSchema>
  | z.infer<typeof SetSwitchCommandSchema>
  | z.infer<typeof SpawnUnitCommandSchema>
  | z.infer<typeof RemoveUnitCommandSchema>
  | z.infer<typeof MoveUnitCommandSchema>
  | z.infer<typeof CameraFocusCommandSchema>
  | z.infer<typeof PlayBgmCommandSchema>
  | z.infer<typeof PlaySeCommandSchema>
  | z.infer<typeof ScreenEffectCommandSchema>
  | z.infer<typeof ChangeObjectiveCommandSchema>
  | z.infer<typeof WaitCommandSchema>
  | z.infer<typeof GotoChapterCommandSchema>
  | BranchCommand;

// EventCommandSchema は自己参照するため z.lazy + 明示的な型注釈で再帰を断ち切る。
// .default() を持つコマンドは入力型と出力型が一致しないため、入力型は unknown に広げる。
export const EventCommandSchema: z.ZodType<EventCommand, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.discriminatedUnion("cmd", [
    ShowMessageCommandSchema,
    ShowChoicesCommandSchema,
    SetVariableCommandSchema,
    SetSwitchCommandSchema,
    SpawnUnitCommandSchema,
    RemoveUnitCommandSchema,
    MoveUnitCommandSchema,
    CameraFocusCommandSchema,
    PlayBgmCommandSchema,
    PlaySeCommandSchema,
    ScreenEffectCommandSchema,
    ChangeObjectiveCommandSchema,
    WaitCommandSchema,
    GotoChapterCommandSchema,
    BranchCommandSchema,
  ]),
);

// discriminatedUnion のオプションは ZodObject である必要があるため型注釈は付けない。
// then / else は z.ZodType<EventCommand> を参照するため循環推論は発生しない。
export const BranchCommandSchema = z.object({
  cmd: z.literal("BRANCH"),
  condition: EventConditionSchema,
  then: z.array(EventCommandSchema),
  else: z.array(EventCommandSchema).optional(),
});

/** コマンド列に含まれる BRANCH の最大ネスト深度を返す(BRANCH 1 個で深さ 1)。 */
export function branchDepth(commands: EventCommand[]): number {
  let max = 0;
  for (const command of commands) {
    if (command.cmd === "BRANCH") {
      const thenDepth = branchDepth(command.then);
      const elseDepth = command.else ? branchDepth(command.else) : 0;
      max = Math.max(max, 1 + Math.max(thenDepth, elseDepth));
    }
  }
  return max;
}

// --- トリガー(7 種) ---------------------------------------------------------

export const EventTriggerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chapterStart") }),
  z.object({ type: z.literal("chapterEnd") }),
  z.object({ type: z.literal("turnStart"), turn: z.number().int().positive() }),
  z.object({ type: z.literal("unitDefeated"), unitId: UnitIdSchema }),
  z.object({ type: z.literal("tileReached"), unitId: UnitIdSchema.optional(), x: coord, y: coord }),
  z.object({ type: z.literal("talk"), unitA: UnitIdSchema, unitB: UnitIdSchema }),
  z.object({ type: z.literal("chestOpened"), x: coord, y: coord }),
]);

export type EventTrigger = z.infer<typeof EventTriggerSchema>;

// --- イベント定義とコレクション ----------------------------------------------

export const EventDefinitionSchema = z
  .object({
    id: EventIdSchema,
    name: z.string().optional(),
    trigger: EventTriggerSchema,
    commands: z.array(EventCommandSchema),
  })
  .superRefine((def, ctx) => {
    const depth = branchDepth(def.commands);
    if (depth > MAX_BRANCH_DEPTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `BRANCH nesting depth ${depth} exceeds max ${MAX_BRANCH_DEPTH}`,
        path: ["commands"],
      });
    }
  });

export type EventDefinition = z.infer<typeof EventDefinitionSchema>;

/** プロジェクト / マップに紐づくイベント集合(id をキーにしたレコード)。 */
export const EventsCollectionSchema = z.record(EventDefinitionSchema);

export type EventsCollection = z.infer<typeof EventsCollectionSchema>;

export function parseEventsRecord(raw: unknown): Record<string, EventDefinition> {
  if (raw === undefined || raw === null || typeof raw !== "object") {
    return {};
  }
  const out: Record<string, EventDefinition> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const parsed = EventDefinitionSchema.parse(value);
    if (parsed.id !== key) {
      throw new Error(`Event key mismatch: ${key} vs ${parsed.id}`);
    }
    out[key] = parsed;
  }
  return out;
}
