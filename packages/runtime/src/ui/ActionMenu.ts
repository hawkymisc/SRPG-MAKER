export type ActionMenuChoice = "attack" | "item" | "wait" | "cancel";

export interface ActionMenuItem {
  id: ActionMenuChoice;
  label: string;
  enabled: boolean;
}

export class ActionMenu {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLUListElement;
  private index = 0;
  private items: ActionMenuItem[] = [];
  private onSelect: ((choice: ActionMenuChoice) => void) | null = null;
  private visible = false;

  constructor(parent: HTMLElement, mapOffsetX: number) {
    this.root = document.createElement("div");
    this.root.className = "srpg-action-menu";
    this.root.style.cssText = [
      "position:absolute",
      `left:${mapOffsetX + 8}px`,
      "top:8px",
      "background:rgba(0,0,0,0.82)",
      "color:#fff",
      "padding:8px 12px",
      "border:2px solid #ffd54f",
      "border-radius:4px",
      "font:14px monospace",
      "display:none",
      "z-index:20",
      "min-width:120px",
    ].join(";");
    this.list = document.createElement("ul");
    this.list.style.cssText = "list-style:none;margin:0;padding:0;";
    this.root.appendChild(this.list);
    parent.appendChild(this.root);
  }

  open(items: ActionMenuItem[], onSelect: (choice: ActionMenuChoice) => void): void {
    this.items = items;
    this.onSelect = onSelect;
    this.index = items.findIndex((i) => i.enabled);
    if (this.index < 0) {
      this.index = 0;
    }
    this.render();
    this.root.style.display = "block";
    this.visible = true;
  }

  close(): void {
    this.root.style.display = "none";
    this.visible = false;
    this.onSelect = null;
  }

  isOpen(): boolean {
    return this.visible;
  }

  moveSelection(delta: number): void {
    if (!this.visible || this.items.length === 0) {
      return;
    }
    const enabledIndexes = this.items
      .map((item, idx) => (item.enabled ? idx : -1))
      .filter((idx) => idx >= 0);
    if (enabledIndexes.length === 0) {
      return;
    }
    const pos = enabledIndexes.indexOf(this.index);
    const next = enabledIndexes[(pos + delta + enabledIndexes.length) % enabledIndexes.length];
    if (next !== undefined) {
      this.index = next;
      this.render();
    }
  }

  confirm(): void {
    if (!this.visible || !this.onSelect) {
      return;
    }
    const item = this.items[this.index];
    if (!item?.enabled) {
      return;
    }
    const handler = this.onSelect;
    this.close();
    handler(item.id);
  }

  cancel(): void {
    if (!this.visible || !this.onSelect) {
      return;
    }
    const handler = this.onSelect;
    this.close();
    handler("cancel");
  }

  private render(): void {
    this.list.replaceChildren();
    this.items.forEach((item, idx) => {
      const li = document.createElement("li");
      const prefix = idx === this.index ? "> " : "  ";
      li.textContent = `${prefix}${item.label}${item.enabled ? "" : " (—)"}`;
      li.style.cssText = item.enabled
        ? idx === this.index
          ? "color:#ffd54f"
          : "color:#fff"
        : "color:#777";
      this.list.appendChild(li);
    });
  }
}
