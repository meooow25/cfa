function randomId(): string {
  return Math.floor(Math.random() * 0x1000000).toString(16).padStart(6, "0");
}

/**
 * Broadcasts on a specific key to other scripts and to self using one-time
 * listeners.
 * 
 * Ideally we would use GM_addValueListener and GM_removeValueListener so it's
 * private to the userscript, but these are not supported by Greasemonkey.
 * 
 * If it has to be exposed to the webpage, there is a perfect BroadcastChannel
 * API. It is supported on every popular browser except Safari (?!).
 * 
 * Using window.localStorage instead, which is widely supported and should work
 * almost everywhere.
 */
export class BroadcastChannel {
  private id = randomId();
  private pending: (() => void)[] = [];
  private storageListener_ = this.storageListener.bind(this);
  constructor(private key: string) {
    this.key = "cfa_broadcast_" + key;
  }

  broadcast() {
    const value = this.id + "_" + Date.now();
    window.localStorage.setItem(this.key, value);
    setTimeout(() => window.localStorage.removeItem(this.key), 500);
    this.resolvePending();
  }

  listenOnce(): Promise<void> {
    if (!this.pending.length) {
      window.addEventListener("storage", this.storageListener_);
    }
    return new Promise((resolve) => this.pending.push(resolve));
  }

  private storageListener(e: StorageEvent) {
    if (
      e.storageArea === window.localStorage &&
      e.key === this.key &&
      e.newValue != null
    ) {
      this.resolvePending();
    }
  }

  private resolvePending() {
    if (!this.pending.length) {
      return;
    }
    window.removeEventListener("storage", this.storageListener_);
    for (const resolve of this.pending) {
      resolve();
    }
    this.pending = [];
  }
}
