"use client";

import { useEffect, useState } from "react";

/**
 * An object URL for a Blob, revoked when the Blob changes or the component unmounts,
 * so results don't pile up in memory while someone works through many files.
 *
 * The URL is created in an effect (not during render) so React's development
 * double-mount can't revoke a URL that is still displayed, and it is only returned
 * while it belongs to the current Blob.
 */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const [entry, setEntry] = useState<{ blob: Blob; url: string } | null>(null);

  useEffect(() => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    // Synchronising with an external resource (the browser's object URL table) is what effects are for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEntry({ blob, url });
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  return entry && blob && entry.blob === blob ? entry.url : null;
}
