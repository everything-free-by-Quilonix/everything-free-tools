import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PDFDocument, StandardFonts } from "pdf-lib";

import { extractPages, imagesToPdf, mergePdfs, pageCount, splitPdf } from "@/engines/pdf/operations";
import { fixedSizeRanges, PageRangeError, parsePageRanges, rangeIndices, rangeLabel } from "@/engines/pdf/ranges";
import { ToolError } from "@/lib/errors";

/** A PDF whose pages each carry their label as text and a distinct width, so order can be checked. */
async function makePdf(labels: string[]): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  labels.forEach((label, index) => {
    const page = document.addPage([300 + index, 400]);
    page.drawText(label, { x: 20, y: 200, size: 24, font });
  });
  return document.save();
}

const widths = async (bytes: Uint8Array) =>
  (await PDFDocument.load(bytes)).getPages().map((page) => Math.round(page.getWidth()));

/** A 1×1 PNG and a 2×1 JPEG, as bytes. */
const PNG_1x1 = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);

describe("PDF page ranges", () => {
  it("parses single pages, ranges, open ends and reversed ranges", () => {
    assert.deepEqual(rangeIndices(parsePageRanges("1-3, 5", 10)), [0, 1, 2, 4]);
    assert.deepEqual(rangeIndices(parsePageRanges("8-", 10)), [7, 8, 9]);
    assert.deepEqual(rangeIndices(parsePageRanges("-2", 10)), [0, 1]);
    assert.deepEqual(rangeIndices(parsePageRanges("3-1", 10)), [2, 1, 0]);
    assert.deepEqual(rangeIndices(parsePageRanges(" 2 ; 2 ", 3)), [1, 1]);
    assert.equal(rangeLabel({ start: 0, end: 2 }), "1-3");
    assert.equal(rangeLabel({ start: 4, end: 4 }), "5");
  });

  it("explains what is wrong with a selection", () => {
    assert.throws(() => parsePageRanges("", 5), PageRangeError);
    assert.throws(() => parsePageRanges("0", 5), /Page 0 doesn't exist: this document has 5 pages/);
    assert.throws(() => parsePageRanges("2-9", 5), /Page 9 doesn't exist/);
    assert.throws(() => parsePageRanges("a", 5), /“a” isn't a page number/);
    assert.throws(() => parsePageRanges("1-2-3", 5), /“1-2-3” isn't/);
    assert.throws(() => parsePageRanges("-", 5), /“-” isn't/);
  });

  it("splits into fixed-size chunks", () => {
    assert.deepEqual(fixedSizeRanges(10, 3).map(rangeLabel), ["1-3", "4-6", "7-9", "10"]);
    assert.deepEqual(fixedSizeRanges(2, 5).map(rangeLabel), ["1-2"]);
  });
});

describe("PDF operations", () => {
  it("merges documents in order without changing pages", async () => {
    const a = await makePdf(["a1", "a2"]);
    const b = await makePdf(["b1"]);
    const merged = await mergePdfs([
      { name: "a.pdf", bytes: a },
      { name: "b.pdf", bytes: b },
    ]);
    assert.deepEqual(await widths(merged), [300, 301, 300]);
    assert.equal(await pageCount({ name: "m.pdf", bytes: merged }), 3);
  });

  it("extracts selected pages in the order asked for", async () => {
    const source = { name: "s.pdf", bytes: await makePdf(["1", "2", "3", "4"]) };
    const out = await extractPages(source, parsePageRanges("4, 1-2", 4));
    assert.deepEqual(await widths(out), [303, 300, 301]);
  });

  it("splits into one document per range", async () => {
    const source = { name: "s.pdf", bytes: await makePdf(["1", "2", "3", "4", "5"]) };
    const parts = await splitPdf(source, fixedSizeRanges(5, 2));
    assert.deepEqual(await Promise.all(parts.map((part) => widths(part.bytes))), [[300, 301], [302, 303], [304]]);
  });

  it("produces the same bytes for the same input", async () => {
    const bytes = await makePdf(["x", "y"]);
    const first = await extractPages({ name: "x.pdf", bytes }, parsePageRanges("2", 2));
    const second = await extractPages({ name: "x.pdf", bytes }, parsePageRanges("2", 2));
    assert.deepEqual(first, second);
  });

  it("reports a file that is not a PDF, and needs two files to merge", async () => {
    await assert.rejects(pageCount({ name: "notes.txt", bytes: new TextEncoder().encode("hello") }), (error) => {
      assert.ok(error instanceof ToolError);
      assert.match(error.message, /“notes.txt” couldn't be read as a PDF/);
      return true;
    });
    await assert.rejects(mergePdfs([{ name: "a.pdf", bytes: await makePdf(["a"]) }]), /at least two PDFs/);
  });

  it("puts each image on its own page, sized to the image or fitted inside A4", async () => {
    const fit = await imagesToPdf(
      [
        { bytes: PNG_1x1, type: "image/png" },
        { bytes: PNG_1x1, type: "image/png" },
      ],
      { pageSize: "fit", margin: 0 },
    );
    const fitDoc = await PDFDocument.load(fit);
    assert.equal(fitDoc.getPageCount(), 2);
    assert.equal(fitDoc.getPage(0).getWidth(), 1);

    const a4 = await PDFDocument.load(
      await imagesToPdf([{ bytes: PNG_1x1, type: "image/png" }], { pageSize: "a4", margin: 36 }),
    );
    assert.deepEqual([Math.round(a4.getPage(0).getWidth()), Math.round(a4.getPage(0).getHeight())], [595, 842]);
    await assert.rejects(imagesToPdf([], { pageSize: "fit", margin: 0 }), /at least one image/);
  });
});
