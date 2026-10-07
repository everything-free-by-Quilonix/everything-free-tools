import { PDFDocument, PageSizes, type PDFImage } from "pdf-lib";

import { ToolError } from "@/lib/errors";

import { rangeIndices, type PageRange } from "./ranges";

/**
 * PDF operations, built on pdf-lib (MIT). Pure functions over bytes: no DOM, no
 * network, so they run the same in the page, in a worker and in the unit tests.
 *
 * pdf-lib copies pages between documents without re-rendering them, so text stays
 * text and quality is unchanged. It cannot open encrypted (password-protected)
 * PDFs; those are reported as such rather than failing obscurely.
 *
 * Output is deterministic: creation and modification dates are fixed and the
 * producer is named, so the same input gives the same bytes.
 */

const PRODUCER = "Everything.Free Tools (pdf-lib)";
const EPOCH = new Date(0);

async function open(bytes: Uint8Array, name: string): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    const technical = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    if (/encrypt/i.test(technical))
      throw new ToolError(
        `“${name}” is password-protected. Remove the password in a PDF reader first, then try again.`,
        technical,
      );
    throw new ToolError(`“${name}” couldn't be read as a PDF. It may be damaged or not a PDF.`, technical);
  }
}

async function finish(document: PDFDocument): Promise<Uint8Array> {
  document.setProducer(PRODUCER);
  document.setCreator(PRODUCER);
  document.setCreationDate(EPOCH);
  document.setModificationDate(EPOCH);
  return document.save({ useObjectStreams: true });
}

export interface PdfSource {
  name: string;
  bytes: Uint8Array;
}

/** Number of pages, for showing before any work is done. */
export async function pageCount(source: PdfSource): Promise<number> {
  return (await open(source.bytes, source.name)).getPageCount();
}

/** Joins whole documents, in the order given. */
export async function mergePdfs(sources: readonly PdfSource[], signal?: AbortSignal): Promise<Uint8Array> {
  if (sources.length < 2) throw new ToolError("Choose at least two PDFs to merge.");
  const output = await PDFDocument.create();
  for (const source of sources) {
    signal?.throwIfAborted();
    const input = await open(source.bytes, source.name);
    const pages = await output.copyPages(input, input.getPageIndices());
    for (const page of pages) output.addPage(page);
  }
  return finish(output);
}

/** One new document holding the selected pages, in the order selected. */
export async function extractPages(source: PdfSource, ranges: readonly PageRange[]): Promise<Uint8Array> {
  const input = await open(source.bytes, source.name);
  const indices = rangeIndices(ranges);
  if (indices.length === 0) throw new ToolError("No pages selected.");
  const output = await PDFDocument.create();
  for (const page of await output.copyPages(input, indices)) output.addPage(page);
  return finish(output);
}

/** One new document per range. */
export async function splitPdf(
  source: PdfSource,
  ranges: readonly PageRange[],
  signal?: AbortSignal,
): Promise<{ range: PageRange; bytes: Uint8Array }[]> {
  const input = await open(source.bytes, source.name);
  const parts: { range: PageRange; bytes: Uint8Array }[] = [];
  for (const range of ranges) {
    signal?.throwIfAborted();
    const output = await PDFDocument.create();
    for (const page of await output.copyPages(input, rangeIndices([range]))) output.addPage(page);
    parts.push({ range, bytes: await finish(output) });
  }
  return parts;
}

export type PageSizeChoice = "fit" | "a4" | "letter";

export interface ImageInput {
  /** JPEG or PNG bytes. Other formats are converted to one of these before they get here. */
  bytes: Uint8Array;
  type: "image/jpeg" | "image/png";
}

export interface ImagesToPdfOptions {
  pageSize: PageSizeChoice;
  /** Margin in points (1/72 inch) on fixed-size pages. */
  margin: number;
}

/**
 * One page per image. "fit" makes each page exactly the image's size (at 72 dpi
 * equivalence, which keeps every pixel); A4 and Letter centre the image, scaled
 * down to fit inside the margin, on a portrait or landscape page to match it.
 */
export async function imagesToPdf(
  images: readonly ImageInput[],
  options: ImagesToPdfOptions,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (images.length === 0) throw new ToolError("Choose at least one image.");
  const output = await PDFDocument.create();
  for (const image of images) {
    signal?.throwIfAborted();
    let embedded: PDFImage;
    try {
      embedded = image.type === "image/png" ? await output.embedPng(image.bytes) : await output.embedJpg(image.bytes);
    } catch (error) {
      throw new ToolError("One of the images couldn't be added. It may be damaged.", String(error));
    }
    const { width, height } = embedded;
    if (options.pageSize === "fit") {
      output.addPage([width, height]).drawImage(embedded, { x: 0, y: 0, width, height });
      continue;
    }
    const base = options.pageSize === "a4" ? PageSizes.A4 : PageSizes.Letter;
    const landscape = width > height;
    const [pageWidth, pageHeight] = landscape ? [base[1], base[0]] : [base[0], base[1]];
    const margin = Math.max(0, Math.min(options.margin, Math.min(pageWidth, pageHeight) / 4));
    const scale = Math.min(1, (pageWidth - 2 * margin) / width, (pageHeight - 2 * margin) / height);
    const drawWidth = width * scale;
    const drawHeight = height * scale;
    output.addPage([pageWidth, pageHeight]).drawImage(embedded, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }
  return finish(output);
}
