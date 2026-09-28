"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { isAbort, toUserError, type UserError } from "@/lib/errors";

export type TaskState<O> =
  | { status: "idle" }
  | { status: "running"; progress: number | null; label?: string }
  | { status: "done"; output: O }
  | { status: "error"; error: UserError };

export interface TaskControls {
  signal: AbortSignal;
  onProgress: (value: number, label?: string) => void;
}

/**
 * State for one cancellable piece of work. Starting a new run cancels the previous
 * one, and a result that arrives after cancellation is ignored, so a slow first run
 * can never overwrite a newer result.
 */
export function useTask<O>() {
  const [state, setState] = useState<TaskState<O>>({ status: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async (work: (controls: TaskControls) => Promise<O>) => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ status: "running", progress: null });
    try {
      const output = await work({
        signal: current.signal,
        onProgress: (value, label) => {
          if (!current.signal.aborted) setState({ status: "running", progress: value, label });
        },
      });
      if (!current.signal.aborted) setState({ status: "done", output });
    } catch (error) {
      if (current.signal.aborted || isAbort(error)) return;
      setState({ status: "error", error: toUserError(error) });
    }
  }, []);

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setState({ status: "idle" });
  }, []);

  const reset = cancel;

  return { state, run, cancel, reset };
}
