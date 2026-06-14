export class ChoiceDialog {
  private readonly root: HTMLDivElement;
  private readonly list: HTMLUListElement;
  private index = 0;
  private choices: string[] = [];
  private visible = false;
  private resolveChoice: ((index: number) => void) | null = null;
  private keyHandler: ((ev: KeyboardEvent) => void) | null = null;

  constructor(parent: HTMLElement, mapOffsetX: number) {
    this.root = document.createElement("div");
    this.root.className = "srpg-choice-dialog";
    this.root.style.cssText = [
      "position:absolute",
      `left:${mapOffsetX + 8}px`,
      "top:48px",
      "background:rgba(0,0,0,0.9)",
      "color:#fff",
      "padding:10px 14px",
      "border:2px solid #81c784",
      "border-radius:4px",
      "font:14px monospace",
      "display:none",
      "z-index:31",
      "min-width:180px",
    ].join(";");
    this.list = document.createElement("ul");
    this.list.style.cssText = "list-style:none;margin:0;padding:0;";
    this.root.appendChild(this.list);
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.visible;
  }

  show(choices: string[]): Promise<number> {
    this.close();
    this.choices = choices;
    this.index = 0;
    this.render();
    this.root.style.display = "block";
    this.visible = true;

    return new Promise((resolve) => {
      this.resolveChoice = resolve;
      this.keyHandler = (ev: KeyboardEvent) => {
        if (ev.key === "ArrowUp" || ev.key === "w" || ev.key === "W") {
          ev.preventDefault();
          this.move(-1);
        } else if (ev.key === "ArrowDown" || ev.key === "s" || ev.key === "S") {
          ev.preventDefault();
          this.move(1);
        } else if (["Enter", " ", "z", "Z"].includes(ev.key)) {
          ev.preventDefault();
          this.confirm();
        }
      };
      window.addEventListener("keydown", this.keyHandler);
    });
  }

  move(delta: number): void {
    if (!this.visible || this.choices.length === 0) {
      return;
    }
    this.index = (this.index + delta + this.choices.length) % this.choices.length;
    this.render();
  }

  confirm(): void {
    if (!this.visible || !this.resolveChoice) {
      return;
    }
    const done = this.resolveChoice;
    const selected = this.index;
    this.close();
    done(selected);
  }

  close(): void {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.root.style.display = "none";
    this.visible = false;
    this.resolveChoice = null;
  }

  private render(): void {
    this.list.replaceChildren();
    this.choices.forEach((choice, idx) => {
      const li = document.createElement("li");
      li.textContent = `${idx === this.index ? "> " : "  "}${choice}`;
      li.style.cssText = idx === this.index ? "color:#81c784" : "color:#fff";
      this.list.appendChild(li);
    });
  }
}
