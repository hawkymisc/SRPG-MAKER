export interface MessageShowOptions {
  speakerId?: string;
  speakerName?: string;
  faceId?: string;
}

function parseShowArgs(
  text: string,
  options?: MessageShowOptions | string,
): { text: string; speakerId?: string; speakerName?: string; faceId?: string } {
  if (typeof options === "string") {
    return { text, speakerId: options };
  }
  return { text, ...options };
}

function faceInitial(label: string): string {
  return label.slice(0, 1) || "?";
}

export class MessageWindow {
  private readonly root: HTMLDivElement;
  private readonly faceEl: HTMLDivElement;
  private readonly bodyEl: HTMLDivElement;
  private readonly speakerEl: HTMLDivElement;
  private readonly textEl: HTMLDivElement;
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

    this.faceEl = document.createElement("div");
    this.faceEl.className = "srpg-message-face";
    this.faceEl.style.cssText = [
      "width:72px",
      "height:72px",
      "border:2px solid #ffd54f",
      "border-radius:4px",
      "background:#263238",
      "color:#ffd54f",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-size:28px",
      "font-weight:bold",
      "flex-shrink:0",
    ].join(";");

    this.bodyEl = document.createElement("div");
    this.bodyEl.style.cssText = "flex:1;min-width:0;";

    this.speakerEl = document.createElement("div");
    this.speakerEl.style.cssText = "color:#ffd54f;margin-bottom:6px;font-weight:bold;";

    this.textEl = document.createElement("div");
    this.textEl.style.cssText = "white-space:pre-wrap;";

    this.bodyEl.appendChild(this.speakerEl);
    this.bodyEl.appendChild(this.textEl);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;gap:12px;align-items:flex-start;";
    row.appendChild(this.faceEl);
    row.appendChild(this.bodyEl);
    this.root.appendChild(row);
    parent.appendChild(this.root);
  }

  isOpen(): boolean {
    return this.visible;
  }

  show(text: string, options?: MessageShowOptions | string): Promise<void> {
    const parsed = parseShowArgs(text, options);
    this.close();

    const speakerLabel = parsed.speakerName ?? parsed.speakerId ?? "";
    this.speakerEl.textContent = speakerLabel;
    this.speakerEl.style.display = speakerLabel ? "block" : "none";
    this.textEl.textContent = parsed.text;

    const faceLabel = parsed.speakerName ?? parsed.faceId ?? parsed.speakerId ?? "";
    if (faceLabel) {
      this.faceEl.textContent = faceInitial(faceLabel);
      this.faceEl.style.display = "flex";
    } else {
      this.faceEl.textContent = "";
      this.faceEl.style.display = "none";
    }

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
