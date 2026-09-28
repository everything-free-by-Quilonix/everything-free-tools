import type { ToolDefinition } from "./types";

/**
 * Every tool, as data. Adding a tool starts here.
 *
 * Every definition is checked when the registry loads (`index.ts`). A LOCAL tool
 * that claims to need the network, a related slug that does not exist, or a NETWORK
 * tool that does not say where data goes, fails the build.
 */

const LOCAL = {
  processing: "LOCAL",
  privacy: { filesLeaveDevice: false, networkRequired: false },
} as const;

export const toolDefinitions: readonly ToolDefinition[] = [
  {
    id: "json-formatter",
    slug: "json-formatter",
    name: "JSON Formatter",
    shortDescription: "Format, validate and minify JSON, with the exact location of any error.",
    description:
      "Paste JSON to pretty-print it with your choice of indentation, minify it, or check that it is valid. Errors are reported with the line and column. Numbers and strings are kept exactly as written, so large integers and precise decimals are never rounded.",
    category: "developer",
    alsoIn: ["data"],
    ...LOCAL,
    inputs: [{ kind: "text", label: "JSON" }],
    outputs: [{ kind: "text", label: "Formatted JSON", formats: ["json"] }],
    capabilities: { required: [], optional: ["web-workers", "clipboard-write"] },
    limitations: [
      "Very large documents (tens of megabytes) use a lot of memory, because the whole document is held in the page.",
      "Strict JSON only: comments, trailing commas and single-quoted strings are reported as errors rather than fixed.",
      "Duplicate keys are kept as written. JSON allows them, but many programs keep only the last one.",
    ],
    howItWorks: [
      "Your text is read by a strict JSON parser that runs in a background worker in this page.",
      "The parser rebuilds the document with the indentation you choose, copying every number and string exactly.",
      "If the text is not valid JSON, it stops at the first problem and reports the line and column.",
    ],
    tasks: ["format json", "pretty print json", "validate json", "minify json", "beautify json", "check json"],
    keywords: ["json", "formatter", "prettify", "beautifier", "validator", "linter", "minifier", "indent"],
    related: ["base64", "uuid-generator", "text-counter"],
    status: "AVAILABLE",
    license: "MIT",
  },
  {
    id: "text-counter",
    slug: "text-counter",
    name: "Word & Character Counter",
    shortDescription: "Count words, characters, sentences, lines and paragraphs as you type.",
    description:
      "Type or paste text to count words, characters with and without spaces, sentences, lines and paragraphs, with an estimated reading time. Counting follows your browser's language rules, so accented letters, emoji and non-Latin scripts are counted as people read them.",
    category: "text",
    alsoIn: ["everyday", "education"],
    ...LOCAL,
    inputs: [{ kind: "text", label: "Text" }],
    outputs: [{ kind: "text", label: "Counts" }],
    capabilities: { required: [], optional: ["intl-segmenter"] },
    limitations: [
      "Word and sentence boundaries follow the browser's language rules, which can differ slightly from a word processor's.",
      "Reading time is an estimate at 230 words per minute.",
      "Without Intl.Segmenter (some older browsers) words are split on spaces and punctuation, which is less accurate for languages written without spaces.",
    ],
    howItWorks: [
      "Counting happens in this page as you type, with no network requests.",
      "Characters are counted as visible symbols (grapheme clusters), so an emoji or an accented letter counts as one.",
      "Words and sentences are found with the browser's built-in text segmenter.",
    ],
    tasks: ["count words", "count characters", "word count", "character count", "letter count", "reading time"],
    keywords: ["word counter", "character counter", "letters", "sentences", "paragraphs", "lines", "essay length"],
    related: ["json-formatter", "base64"],
    status: "AVAILABLE",
    license: "MIT",
  },
  {
    id: "uuid-generator",
    slug: "uuid-generator",
    name: "UUID Generator",
    shortDescription: "Generate random (v4) or time-ordered (v7) UUIDs in bulk.",
    description:
      "Generate one or up to 1,000 UUIDs at once. Version 4 UUIDs are random; version 7 UUIDs start with a timestamp, so they sort in the order they were created. Randomness comes from your browser's cryptographic random number generator.",
    category: "developer",
    alsoIn: ["security"],
    ...LOCAL,
    inputs: [{ kind: "options", label: "Version, count and format" }],
    outputs: [{ kind: "text", label: "UUIDs", formats: ["txt"] }],
    capabilities: { required: ["web-crypto"], optional: ["random-uuid", "clipboard-write"] },
    limitations: [
      "A version 7 UUID contains the time it was generated, to the millisecond. Use version 4 if that should not be revealed.",
      "UUIDs are identifiers, not secrets. Do not use them as passwords or access tokens.",
    ],
    howItWorks: [
      "Random bits come from crypto.getRandomValues, the browser's cryptographically secure generator. Math.random is never used.",
      "Version and variant bits are set as specified in RFC 9562.",
      "Version 7 puts the current Unix time in milliseconds in the first 48 bits.",
    ],
    tasks: ["generate uuid", "generate guid", "random id", "uuid v4", "uuid v7"],
    keywords: ["uuid", "guid", "unique id", "identifier", "rfc 9562", "rfc 4122", "random"],
    related: ["base64", "json-formatter"],
    status: "AVAILABLE",
    license: "MIT",
  },
  {
    id: "base64",
    slug: "base64",
    name: "Base64 Encoder / Decoder",
    shortDescription: "Encode text or files to Base64, and decode Base64 back to text or a file.",
    description:
      "Convert text to Base64 and back, with full UTF-8 support and a URL-safe option. You can also encode a file, or decode Base64 that contains binary data and download it. Base64 is an encoding, not encryption: anyone can decode it.",
    category: "developer",
    alsoIn: ["data"],
    ...LOCAL,
    inputs: [
      { kind: "text", label: "Text or Base64" },
      { kind: "file", label: "File to encode", multiple: false },
    ],
    outputs: [
      { kind: "text", label: "Base64 or text" },
      { kind: "file", label: "Decoded file" },
    ],
    capabilities: { required: [], optional: ["clipboard-write"] },
    limitations: [
      "Base64 makes data about a third larger. It does not compress or protect anything.",
      "Encoding a large file produces a very large string, which can make the page slow to display.",
    ],
    howItWorks: [
      "Text is converted to UTF-8 bytes, and the bytes are encoded to Base64 in this page.",
      "Decoding checks that the input is valid Base64 first, then shows the result as text if it is valid UTF-8, or offers it as a file if it is binary.",
      "The URL-safe option uses - and _ instead of + and / and can omit padding, as in RFC 4648 §5.",
    ],
    tasks: ["encode base64", "decode base64", "base64 to text", "text to base64", "file to base64"],
    keywords: ["base64", "encoder", "decoder", "b64", "url safe", "rfc 4648", "data uri"],
    related: ["json-formatter", "uuid-generator"],
    status: "AVAILABLE",
    license: "MIT",
  },
  {
    id: "image-compressor",
    slug: "image-compressor",
    name: "Image Compressor",
    shortDescription: "Make JPEG, PNG and WebP images smaller, in your browser.",
    description:
      "Compress one image or many at once by re-encoding them as JPEG or WebP at the quality you choose. Transparency is kept, photos are rotated the way they were taken, and you see the size before and after. Your images are processed on your device and never uploaded.",
    category: "image",
    ...LOCAL,
    inputs: [
      {
        kind: "file",
        label: "Images",
        accept: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/bmp"],
        multiple: true,
      },
    ],
    outputs: [{ kind: "image", label: "Compressed images", formats: ["jpeg", "webp", "png"] }],
    capabilities: {
      required: ["canvas", "create-image-bitmap"],
      optional: ["web-workers", "offscreen-canvas"],
    },
    limitations: [
      "Re-encoding removes metadata such as camera details and GPS location, and may drop embedded colour profiles.",
      "Very large images use a lot of memory. Browsers also cap canvas size, typically around 16,000 pixels on a side.",
      "Animated images are not supported; GIFs are not accepted.",
      "WebP output needs a browser that can encode WebP. Where it cannot, PNG is produced instead and the result says so.",
      "Compressing an image that is already heavily compressed can make it larger. When that happens the result says so.",
    ],
    howItWorks: [
      "Each image is decoded by your browser, applying its orientation, and redrawn onto a canvas in a background worker.",
      "The canvas is re-encoded at the quality you choose. In Auto mode, images with transparency become WebP and others become JPEG.",
      "The result stays in this page until you download it. The original file is never changed.",
    ],
    tasks: [
      "compress image",
      "reduce image size",
      "shrink photo",
      "optimize image",
      "make image smaller",
      "compress jpg",
    ],
    keywords: ["image compressor", "jpeg", "jpg", "png", "webp", "photo", "picture", "file size", "optimise"],
    related: ["qr-generator", "base64"],
    status: "AVAILABLE",
    license: "MIT",
  },
  {
    id: "qr-generator",
    slug: "qr-generator",
    name: "QR Code Generator",
    shortDescription: "Create QR codes for links, text or Wi-Fi networks, as PNG or SVG.",
    description:
      "Turn a link, some text or Wi-Fi network details into a QR code. Choose the error-correction level, size and colours, then download it as a PNG image or a scalable SVG. Codes are generated in your browser and never expire, because nothing is stored anywhere.",
    category: "qr-barcode",
    alsoIn: ["everyday"],
    ...LOCAL,
    inputs: [
      { kind: "text", label: "Text or link" },
      { kind: "options", label: "Wi-Fi network details" },
    ],
    outputs: [{ kind: "image", label: "QR code", formats: ["png", "svg"] }],
    capabilities: { required: ["canvas"], optional: [] },
    limitations: [
      "A QR code can hold at most about 2,900 bytes at the lowest error correction, and less at higher levels.",
      "Low-contrast colours or light codes on dark backgrounds may not scan on every phone.",
      "The Wi-Fi password is part of the code: anyone who can see the code can read it.",
    ],
    howItWorks: [
      "The content is encoded into a QR symbol by the open-source uqr library, running in this page.",
      "Wi-Fi details are written in the standard WIFI: format that phone cameras recognise, with special characters escaped.",
      "The preview and downloads are drawn locally. No link shortener or tracking redirect is used.",
    ],
    tasks: ["create qr code", "make qr code", "qr code for link", "qr wifi", "wifi qr code", "qr code generator"],
    keywords: ["qr", "qr code", "barcode", "wifi", "wi fi", "link", "url", "png", "svg"],
    related: ["image-compressor", "base64"],
    status: "AVAILABLE",
    license: "MIT",
    dependencies: [{ name: "uqr", license: "MIT", url: "https://github.com/unjs/uqr" }],
  },
];
