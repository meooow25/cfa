import { assert } from "./assert.ts";

/** Simple single callback observable. */
export class Observable<T> {
  private callback: ((value: T) => void) | null = null;

  notify(value: T) {
    if (this.callback) {
      this.callback(value);
    }
  }

  setCallback(fn: (value: T) => void) {
    assert(!this.callback, "Callback already set, if intentional clear first");
    this.callback = fn;
  }

  clearCallback() {
    this.callback = null;
  }
}
