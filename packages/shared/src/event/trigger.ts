import type { EventDefinition, EventTrigger } from "../schemas/event.js";

/** イベント定義の trigger と、発火したトリガーが一致するか判定する。 */
export function matchTrigger(fired: EventTrigger, event: EventDefinition): boolean {
  const pattern = event.trigger;
  if (fired.type !== pattern.type) return false;

  switch (pattern.type) {
    case "chapterStart":
    case "chapterEnd":
      return true;
    case "turnStart":
      return fired.type === "turnStart" && fired.turn === pattern.turn;
    case "unitDefeated":
      return fired.type === "unitDefeated" && fired.unitId === pattern.unitId;
    case "tileReached":
      if (fired.type !== "tileReached") return false;
      if (fired.x !== pattern.x || fired.y !== pattern.y) return false;
      if (pattern.unitId !== undefined) {
        return fired.unitId === pattern.unitId;
      }
      return true;
    case "talk":
      return (
        fired.type === "talk" &&
        fired.unitA === pattern.unitA &&
        fired.unitB === pattern.unitB
      );
    case "chestOpened":
      return fired.type === "chestOpened" && fired.x === pattern.x && fired.y === pattern.y;
    default:
      return false;
  }
}
