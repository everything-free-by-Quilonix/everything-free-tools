"use client";

import { checkFiles } from "@/lib/files";

/**
 * Helpers shared by the PDF workspaces.
 *
 * The PDF engine (and pdf-lib inside it) is loaded on first use, not with the page,
 * so opening a PDF tool stays fast and other pages never download it.
 */

export const PDF_ACCEPT = ["application/pdf", ".pdf"] as const;

export const loadPdfEngine = () => import("@/engines/pdf/operations");

/** Image to PDF's image decoding, loaded on first use for the same reason. */
export const loadImagePrep = () => import("@/tools/image-to-pdf/prepare");

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Splits chosen files into PDFs and a message about any that were not. */
export function takePdfs(files: File[]): { pdfs: File[]; rejected: string | null } {
  const { accepted, rejected } = checkFiles(files, ["application/pdf"]);
  return {
    pdfs: accepted,
    rejected:
      rejected.length === 0
        ? null
        : `${rejected.map((entry) => `“${entry.file.name}”`).join(", ")} ${rejected.length === 1 ? "isn't a PDF" : "aren't PDFs"}, so ${rejected.length === 1 ? "it was" : "they were"} skipped.`,
  };
}
