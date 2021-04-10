import { GmSetGetValue } from "./gm.ts";
import { assert } from "./assert.ts";

export interface Field<T> {
  set(value: T | null): Promise<void>;
  get(): Promise<T | null>;
}

/** A userscript value storage field. T must be JSON serializable. */
export class GmField<T> implements Field<T> {
  constructor(
    private gm: GmSetGetValue,
    private key: string,
  ) {
    assert(gm.getValue && gm.setValue, "getValue and setValue not supported");
  }

  async set(value: T | null): Promise<void> {
    const serialized = JSON.stringify(value);
    return await this.gm.setValue!(this.key, serialized);
  }

  async get(): Promise<T | null> {
    const serialized = await this.gm.getValue!(this.key);
    return serialized != null ? JSON.parse(serialized) : null;
  }
}
