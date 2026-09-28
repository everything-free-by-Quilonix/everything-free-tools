import { serializeError, type RunMessage, type TaskHandler, type WorkerMessage } from "./protocol";

/**
 * Worker-side half of the protocol. A worker file is one line:
 *
 *   exposeTask(compressImage);
 *
 * `transfer` names buffers in the result to move rather than copy back to the page.
 */

interface WorkerScope {
  onmessage: ((event: MessageEvent) => void) | null;
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

export function exposeTask<I, O>(handler: TaskHandler<I, O>, transfer?: (output: O) => Transferable[]): void {
  const scope = globalThis as unknown as WorkerScope;

  scope.onmessage = async (event: MessageEvent<RunMessage<I>>) => {
    if (event.data?.type !== "run") return;
    const post = (message: WorkerMessage<O>, list?: Transferable[]) => scope.postMessage(message, list ?? []);

    try {
      const output = await handler(event.data.input, {
        progress: (value, label) => post({ type: "progress", value, label }),
      });
      post({ type: "result", output }, transfer?.(output));
    } catch (error) {
      post({ type: "error", error: serializeError(error) });
    }
  };
}
