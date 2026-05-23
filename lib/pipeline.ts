/**
 * Declarative Pipeline Engine
 *
 * Pure functional composition primitives for immutable data transformations.
 * All operations are referentially transparent — no side effects, no mutation.
 *
 * Complexity: pipe/compose are O(n) where n = number of stages.
 * Memory: each stage produces a new immutable value; no in-place mutation.
 */

/** A pure transform: takes A, returns B. No side effects. */
export type Transform<A, B> = (input: A) => B;

/** A predicate: takes A, returns boolean. */
export type Predicate<A> = (input: A) => boolean;

/** Result of a validated pipeline stage — either success or failure with reason. */
export type PipelineResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: string };

/** Compose two transforms left-to-right: f then g. */
export function compose<A, B, C>(
  f: Transform<A, B>,
  g: Transform<B, C>
): Transform<A, C> {
  return (input: A) => g(f(input));
}

/** Pipe a value through an ordered array of transforms. O(n) sequential. */
export function pipe<T>(initial: T, ...stages: ReadonlyArray<Transform<T, T>>): T {
  return stages.reduce<T>((acc, stage) => stage(acc), initial);
}

/** Lift a pure function into a PipelineResult chain. */
export function lift<A, B>(
  transform: Transform<A, B>
): Transform<PipelineResult<A>, PipelineResult<B>> {
  return (input) => {
    if (!input.ok) return input;
    try {
      return { ok: true, value: transform(input.value) };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  };
}

/** Guard: validate a value against a predicate, short-circuit on failure. */
export function guard<T>(
  predicate: Predicate<T>,
  errorMessage: string
): Transform<PipelineResult<T>, PipelineResult<T>> {
  return (input) => {
    if (!input.ok) return input;
    return predicate(input.value)
      ? input
      : { ok: false, error: errorMessage };
  };
}

/** Create a successful PipelineResult. */
export function succeed<T>(value: T): PipelineResult<T> {
  return { ok: true, value };
}

/** Create a failed PipelineResult. */
export function fail<T = never>(error: string): PipelineResult<T> {
  return { ok: false, error };
}

/** Chain multiple result-aware transforms. */
export function chain<T>(
  initial: PipelineResult<T>,
  ...stages: ReadonlyArray<Transform<PipelineResult<T>, PipelineResult<T>>>
): PipelineResult<T> {
  return stages.reduce<PipelineResult<T>>((acc, stage) => stage(acc), initial);
}

/** Map over a readonly array with a pure transform. Returns new array. */
export function mapImmutable<A, B>(
  items: ReadonlyArray<A>,
  transform: Transform<A, B>
): ReadonlyArray<B> {
  return items.map(transform);
}

/** Filter a readonly array with a predicate. Returns new array. */
export function filterImmutable<A>(
  items: ReadonlyArray<A>,
  predicate: Predicate<A>
): ReadonlyArray<A> {
  return items.filter(predicate);
}

/** Partition a readonly array into [matches, nonMatches]. */
export function partition<A>(
  items: ReadonlyArray<A>,
  predicate: Predicate<A>
): readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  const matches: A[] = [];
  const nonMatches: A[] = [];
  for (const item of items) {
    (predicate(item) ? matches : nonMatches).push(item);
  }
  return [matches, nonMatches] as const;
}

/** Aggregate/reduce a readonly array to a single value. */
export function fold<A, B>(
  items: ReadonlyArray<A>,
  initial: B,
  reducer: (acc: B, item: A) => B
): B {
  return items.reduce(reducer, initial);
}
