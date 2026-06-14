import type { SwitchId, VariableId } from "../schemas/ids.js";
import type { BattleState } from "../battle/types.js";
import type { EventCommand } from "../schemas/event.js";

/** 変数・スイッチのイベント用状態(戦闘状態と共有)。 */
export interface EventVariableState {
  variables: Record<VariableId, number>;
  switches: Record<SwitchId, boolean>;
}

/** BRANCH 条件評価に必要なコンテキスト。 */
export interface EventConditionContext extends EventVariableState {
  units?: import("../battle/types.js").BattleUnit[];
}

/** 純粋コマンド実行の入力コンテキスト。 */
export interface EventCommandContext {
  battleState: BattleState;
}

/** runtime へ委譲する演出コマンドの effect。 */
export type DeferredCommandEffect = {
  kind: "defer";
  cmd: EventCommand;
};

export type BranchEvalEffect = {
  kind: "branch";
  result: boolean;
};

export type SpawnEffect = {
  kind: "spawn";
  instanceId: string;
  effect: "none";
};

export type RemoveEffect = {
  kind: "remove";
  instanceId: string;
  effect: "fade" | "warp" | "none";
};

export type PureCommandEffect =
  | DeferredCommandEffect
  | BranchEvalEffect
  | SpawnEffect
  | RemoveEffect;

export interface PureCommandResult {
  state: BattleState;
  effects: PureCommandEffect[];
}
