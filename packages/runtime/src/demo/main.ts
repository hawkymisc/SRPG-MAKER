import { bootstrapRuntime } from "../editorTestPlayBridge.js";

const shell = document.getElementById("game-shell");
if (!shell) {
  throw new Error("Missing #game-shell");
}

const canvasHost = document.createElement("div");
canvasHost.id = "game";
canvasHost.style.position = "relative";
shell.appendChild(canvasHost);

void bootstrapRuntime(canvasHost);
