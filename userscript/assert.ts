type Falsy = false | 0 | "" | null | undefined;
type Truthy<T> = Exclude<T, Falsy>;

export function assert<T>(v: T, msg: string): asserts v is Truthy<T> {
  if (!v) {
    throw new Error(msg);
  }
}
