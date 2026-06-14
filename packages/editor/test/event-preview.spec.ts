import { describe, expect, it } from "vitest";
import { EventCommandSchema } from "@srpg/shared";
import { flattenCommands } from "../src/lib/events/eventCommandEditor.js";

describe("event dialogue preview data", () => {
  it("lists dialogue commands in flatten order", () => {
    const commands = [
      EventCommandSchema.parse({ cmd: "WAIT", ms: 100 }),
      EventCommandSchema.parse({ cmd: "SHOW_MESSAGE", speakerId: "unit_alm", text: "hello" }),
      EventCommandSchema.parse({ cmd: "SHOW_CHOICES", choices: ["A", "B"], resultVar: "var_choice" }),
    ];
    const dialogueRows = flattenCommands(commands).filter(
      (row) => row.command.cmd === "SHOW_MESSAGE" || row.command.cmd === "SHOW_CHOICES",
    );
    expect(dialogueRows).toHaveLength(2);
    expect(dialogueRows[0]?.path).toBe("1");
    expect(dialogueRows[1]?.path).toBe("2");
  });
});
