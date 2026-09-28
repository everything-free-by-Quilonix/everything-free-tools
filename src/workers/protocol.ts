/**
 * The message protocol between a page and a processing worker.
 *
 * One worker instance runs one task, then is terminated. That keeps the protocol to
 * three messages, makes cancellation a single `terminate()`, and means a crashed or
 * cancelled task can never leave state behind for the next one.
 *
 *   page → worker   { type: "run", input }
 *   worker → page   { type: "progress", value, label? }   (0 or more)
 *   worker → page   { type: "result", output }  |  { type: "error", error }
 */

export interface RunMessage<I> {
  type: "run";
  input: I;
}

export interface SerializedError {
  name: string;
  message: string;
  technical?: string;
}

export type WorkerMessage<O> =
  | { type: "progress"; value: number; label?: string }
  | { type: "result"; output: O }
  | { type: "error"; error: SerializedError };

export interface TaskContext {
  /** Reports progress between 0 and 1. */
  progress(value: number, label?: string): void;
}

/** A processing function. The same function runs in the worker and, as a fallback, on the page. */
export type TaskHandler<I, O> = (input: I, context: TaskContext) => O | Promise<O>;

export function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const technical = (error as { technical?: unknown }).technical;
    return {
      name: error.name,
      message: error.message,
      ...(typeof technical === "string" ? { technical } : {}),
    };
  }
  return { name: "Error", message: String(error) };
}
