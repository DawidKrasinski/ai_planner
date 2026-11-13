export type ResourceState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: null; error: Error };

export function loadingState<T = never>(): ResourceState<T> {
  return { status: "loading", data: null, error: null };
}

export function successState<T>(data: T): ResourceState<T> {
  return { status: "success", data, error: null };
}

export function errorState<T = never>(error: Error): ResourceState<T> {
  return { status: "error", data: null, error };
}

export function isEmptyList(data: unknown): boolean {
  return Array.isArray(data) && data.length === 0;
}
