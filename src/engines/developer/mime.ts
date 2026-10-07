/**
 * Native MIME Type Lookup Engine & Database.
 *
 * Provides a comprehensive, client-side static registry of standard MIME types,
 * file extensions, categories, and descriptions according to IANA and RFC standards.
 * 100% local, zero network.
 */

export interface MimeEntry {
  extension: string;
  mime: string;
  category: "application" | "text" | "image" | "audio" | "video" | "font" | "model";
  description: string;
}

export const MIME_DATABASE: readonly MimeEntry[] = [
  // Application / Data
  { extension: "json", mime: "application/json", category: "application", description: "JavaScript Object Notation" },
  { extension: "pdf", mime: "application/pdf", category: "application", description: "Portable Document Format" },
  { extension: "zip", mime: "application/zip", category: "application", description: "ZIP compressed archive" },
  { extension: "tar", mime: "application/x-tar", category: "application", description: "Tarball archive" },
  { extension: "gz", mime: "application/gzip", category: "application", description: "Gzip compressed archive" },
  { extension: "wasm", mime: "application/wasm", category: "application", description: "WebAssembly binary format" },
  { extension: "xml", mime: "application/xml", category: "application", description: "Extensible Markup Language" },
  { extension: "bin", mime: "application/octet-stream", category: "application", description: "Generic binary data" },
  {
    extension: "docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    category: "application",
    description: "Microsoft Word OpenXML Document",
  },
  {
    extension: "xlsx",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    category: "application",
    description: "Microsoft Excel OpenXML Spreadsheet",
  },
  {
    extension: "pptx",
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    category: "application",
    description: "Microsoft PowerPoint Presentation",
  },
  {
    extension: "epub",
    mime: "application/epub+zip",
    category: "application",
    description: "Electronic Publication (EPUB)",
  },
  {
    extension: "7z",
    mime: "application/x-7z-compressed",
    category: "application",
    description: "7-Zip compressed archive",
  },
  { extension: "rar", mime: "application/vnd.rar", category: "application", description: "RAR compressed archive" },
  { extension: "sh", mime: "application/x-sh", category: "application", description: "POSIX Shell script" },

  // Text
  { extension: "html", mime: "text/html", category: "text", description: "HyperText Markup Language" },
  { extension: "css", mime: "text/css", category: "text", description: "Cascading Style Sheets" },
  { extension: "js", mime: "text/javascript", category: "text", description: "JavaScript source code" },
  { extension: "ts", mime: "text/typescript", category: "text", description: "TypeScript source code" },
  { extension: "txt", mime: "text/plain", category: "text", description: "Plain text document" },
  { extension: "csv", mime: "text/csv", category: "text", description: "Comma-Separated Values" },
  { extension: "md", mime: "text/markdown", category: "text", description: "Markdown text format" },
  { extension: "yaml", mime: "text/yaml", category: "text", description: "YAML Ain't Markup Language" },
  { extension: "sql", mime: "application/sql", category: "text", description: "Structured Query Language script" },

  // Image
  { extension: "png", mime: "image/png", category: "image", description: "Portable Network Graphics" },
  { extension: "jpg", mime: "image/jpeg", category: "image", description: "JPEG lossy image" },
  { extension: "jpeg", mime: "image/jpeg", category: "image", description: "JPEG lossy image" },
  { extension: "webp", mime: "image/webp", category: "image", description: "WebP modern image format" },
  { extension: "avif", mime: "image/avif", category: "image", description: "AV1 Image File Format" },
  { extension: "svg", mime: "image/svg+xml", category: "image", description: "Scalable Vector Graphics" },
  { extension: "gif", mime: "image/gif", category: "image", description: "Graphics Interchange Format" },
  { extension: "ico", mime: "image/vnd.microsoft.icon", category: "image", description: "Icon image format" },
  { extension: "bmp", mime: "image/bmp", category: "image", description: "Bitmap image format" },
  { extension: "tiff", mime: "image/tiff", category: "image", description: "Tagged Image File Format" },

  // Audio
  { extension: "mp3", mime: "audio/mpeg", category: "audio", description: "MPEG Audio Layer III" },
  { extension: "wav", mime: "audio/wav", category: "audio", description: "Waveform Audio File Format" },
  { extension: "ogg", mime: "audio/ogg", category: "audio", description: "Ogg Vorbis audio" },
  { extension: "m4a", mime: "audio/mp4", category: "audio", description: "MPEG-4 Audio" },
  { extension: "flac", mime: "audio/flac", category: "audio", description: "Free Lossless Audio Codec" },
  { extension: "aac", mime: "audio/aac", category: "audio", description: "Advanced Audio Coding" },

  // Video
  { extension: "mp4", mime: "video/mp4", category: "video", description: "MPEG-4 Part 14 video" },
  { extension: "webm", mime: "video/webm", category: "video", description: "WebM open media format" },
  { extension: "ogv", mime: "video/ogg", category: "video", description: "Ogg Theora video" },
  { extension: "mov", mime: "video/quicktime", category: "video", description: "QuickTime video" },
  { extension: "avi", mime: "video/x-msvideo", category: "video", description: "Audio Video Interleave" },
  { extension: "mkv", mime: "video/x-matroska", category: "video", description: "Matroska Multimedia Container" },

  // Font
  { extension: "woff2", mime: "font/woff2", category: "font", description: "Web Open Font Format 2.0" },
  { extension: "woff", mime: "font/woff", category: "font", description: "Web Open Font Format 1.0" },
  { extension: "ttf", mime: "font/ttf", category: "font", description: "TrueType Font" },
  { extension: "otf", mime: "font/otf", category: "font", description: "OpenType Font" },
];

/**
 * Searches the MIME database by extension, mime string, or keyword query.
 */
export function searchMime(query: string, categoryFilter?: string): MimeEntry[] {
  const clean = query.trim().toLowerCase().replace(/^\./, "");

  return MIME_DATABASE.filter((entry) => {
    if (categoryFilter && categoryFilter !== "all" && entry.category !== categoryFilter) {
      return false;
    }
    if (!clean) return true;

    return (
      entry.extension.toLowerCase().includes(clean) ||
      entry.mime.toLowerCase().includes(clean) ||
      entry.description.toLowerCase().includes(clean)
    );
  });
}
