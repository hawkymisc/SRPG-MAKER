import type { EventDefinition, EventTrigger } from "@srpg/shared";
import { matchTrigger } from "@srpg/shared";

export interface TriggerContext {
  turn?: number;
  defeatedUnitRef?: string;
  tileReached?: { unitRef?: string; x: number; y: number };
}

export function findMatchingEvents(
  events: EventDefinition[],
  trigger: EventTrigger,
): EventDefinition[] {
  return events.filter((def) => matchTrigger(trigger, def));
}
