/**
 * User-facing errors.
 *
 * Tools never show a raw exception. They throw or return a `ToolError` whose
 * `message` is written for a person ("We couldn't read this image…"), and keep the
 * underlying technical detail separately, for an optional "Technical details"
 * disclosure.
 */

export class ToolError extends Error {
  readonly technical?: string;

  constructor(message: string, technical?: string) {
    super(message);
    this.name = "ToolError";
    this.technical = technical;
  }
}

export interface UserError {
  message: string;
  technical?: string;
}

function describe(error: unknown): string | undefined {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  return undefined;
}

/** Converts anything thrown into wording a person can act on. */
export function toUserError(error: unknown, fallback = "Something went wrong. Please try again."): UserError {
  if (error instanceof ToolError) return { message: error.message, technical: error.technical };

  const name = error instanceof Error ? error.name : undefined;
  const technical = describe(error);

  switch (name) {
    case "AbortError":
      return { message: "Cancelled.", technical };
    case "EncodingError":
    case "InvalidStateError":
      return {
        message: "We couldn't process this file. It may be corrupted or in a format your browser can't read.",
        technical,
      };
    case "NotSupportedError":
      return { message: "Your browser doesn't support this operation.", technical };
    case "QuotaExceededError":
    case "RangeError":
      return { message: "This is too large for your browser to process. Try a smaller file.", technical };
    case "SecurityError":
    case "NotAllowedError":
      return { message: "Your browser blocked this action. Check the page's permissions and try again.", technical };
    default:
      return { message: fallback, technical };
  }
}

/** True when an error means the user cancelled, which is not a failure to report. */
export function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}
