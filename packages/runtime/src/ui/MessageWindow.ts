export class MessageWindow {
  private readonly root: HTMLDivElement;
  private readonly textEl: HTMLDivElement;
  private readonly speakerEl: HTMLDivElement;
  private visible = false;
  private resolveAdvance: (() => void) | null = null;
  private keyHandler: ((ev: KeyboardEvent) => void) | null = null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "srpg-message-window";
    this.root.style.cssText = [
      "position:absolute",
      "left:8px",
      "right:8px",
      "bottom:8px",
      "background:rgba(0,0,0,0.88)",
      "color:#fff",
      "padding:12px 16px",
      "border:2px solid #4fc3f7",
      "border-radius:6px",
      "font:14px monospace",
      "display:none",
      "z-index:30",
      "line-height:1.5",
    ].join(";");

    this.speakerEl = document.createElement("div");
    this.speakerEl.style.cssText = "color:#ffd54f;margin-bottom:6px;font-weight:bold;";
    this.textEl = document.createElement("div");
    this.root.appendChild(this.speakerEl);
    this.root.appendChild(this.textEl);
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.visible;
  }

  show(text: string, speakerId?: string): Promise<void> {
    this.close();
    this.speakerEl.textContent = speakerId ?? "";
    this.speakerEl.style.display = speakerId ? "block" : "none";
    this.textEl.textContent = text;
    this.root.style.display = "block";
    this.visible = true;

    return new Promise((resolve) => {
      this.resolveAdvance = resolve;
      this.keyHandler = (ev: KeyboardEvent) => {
        if (["Enter", " ", "z", "Z"].includes(ev.key)) {
          ev.preventDefault();
          this.advance();
        }
      };
      window.addEventListener("keydown", this.keyHandler);
      this.root.onclick = () => this.advance();
    });
  }

  advance(): void {
    if (!this.visible || !this.resolveAdvance) {
      return;
    }
    const done = this.resolveAdvance;
    this.close();
    done();
  }

  close(): void {
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.root.onclick = null;
    this.root.style.display = "none";
    this.visible = false;
    this.resolveAdvance = null;
  }
}
