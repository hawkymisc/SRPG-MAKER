export interface AtomicWriteTarget {
  write(content: string): Promise<void>;
}

/** Write full content in one shot (browser File System Access API is atomic per write). */
export async function atomicWrite(target: AtomicWriteTarget, content: string): Promise<void> {
  await target.write(content);
}

export class MemoryWriteTarget implements AtomicWriteTarget {
  public content = "";

  async write(content: string): Promise<void> {
    this.content = content;
  }
}
