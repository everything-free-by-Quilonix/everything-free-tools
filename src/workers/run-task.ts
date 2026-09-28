import { ToolError } from "@/lib/errors";
import type { SerializedError, TaskHandler, WorkerMessage } from "./protocol";

/**
 * Page-side half of the protocol.
 *
 * Runs a task in a fresh worker and resolves with its output. If workers are not
 * available, or the worker cannot start, the same processing function runs on the
 * page instead. The result is identical; only responsiveness differs.
 *
 * The worker is created by the caller (`worker: () => new Worker(new URL(...))`)
 * because bundlers only split a worker into its own file when the `new Worker(new
 * URL(..., import.meta.url))` expression appears literally in source. That is also
 * what keeps each tool's engine out of every other tool's bundle.
 */

export interface RunTaskOptions<I, O> {
  input: I;
  /** Creates the worker. Omit to always run on the page. */
  worker?: () => Worker;
  /** Loads the processing function for the on-page fallback. Lazy, so it is only fetched if needed. */
  fallback: () => Promise<TaskHandler<I, O>>;
  /** Buffers in the input to move into the worker instead of copying. */
  transfer?: Transferable[];
  onProgress?: (value: number, label?: string) => void;
  signal?: AbortSignal;
}

function abortError(): DOMException {
  return new DOMException("The task was cancelled.", "AbortError");
}

function reviveError(error: SerializedError): Error {
  if (error.name === "ToolError") return new ToolError(error.message, error.technical);
  const revived = new Error(error.message);
  revived.name = error.name;
  return revived;
}

async function runOnPage<I, O>(options: RunTaskOptions<I, O>): Promise<O> {
  const handler = await options.fallback();
  if (options.signal?.aborted) throw abortError();
  const output = await handler(options.input, { progress: (value, label) => options.onProgress?.(value, label) });
  if (options.signal?.aborted) throw abortError();
  return output;
}

export function runTask<I, O>(options: RunTaskOptions<I, O>): Promise<O> {
  if (options.signal?.aborted) return Promise.reject(abortError());

  let worker: Worker | null = null;
  if (options.worker && typeof Worker !== "undefined") {
    try {
      worker = options.worker();
    } catch {
      worker = null;
    }
  }
  if (!worker) return runOnPage(options);

  const active = worker;
  return new Promise<O>((resolve, reject) => {
    let settled = false;
    const finish = () => {
      settled = true;
      active.terminate();
      options.signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      finish();
      reject(abortError());
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    active.onmessage = (event: MessageEvent<WorkerMessage<O>>) => {
      const message = event.data;
      if (settled) return;
      if (message.type === "progress") options.onProgress?.(message.value, message.label);
      else if (message.type === "result") {
        finish();
        resolve(message.output);
      } else if (message.type === "error") {
        finish();
        reject(reviveError(message.error));
      }
    };

    // The worker script itself failed to load or crashed: fall back to the page
    // rather than failing a task that the page can still do.
    active.onerror = (event) => {
      event.preventDefault();
      if (settled) return;
      finish();
      runOnPage(options).then(resolve, reject);
    };

    active.postMessage({ type: "run", input: options.input }, options.transfer ?? []);
  });
}
