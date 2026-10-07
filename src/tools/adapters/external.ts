/**
 * External Service Fallback Adapters.
 *
 * For capabilities requiring external distributed services (e.g., PDF to Word, CAD to PDF),
 * provides structured, transparent attribution, privacy warnings, and external links.
 */

import type { ExternalServiceAdapter } from "./types";

export const EXTERNAL_FALLBACK_ADAPTERS: Record<string, ExternalServiceAdapter> = {
  "pdf-to-word": {
    id: "pdf-to-word",
    name: "PDF to Word Converter",
    provider: "91AI Tools",
    serviceUrl: "https://www.91aitool.cn/tools/pdf-to-word",
    privacyNotice:
      "External service: Files are processed on external servers. Do not upload sensitive confidential documents.",
    freeTier: true,
    requiresUpload: true,
    limitsDescription: "Subject to external server file size limits.",
  },
  "pdf-to-excel": {
    id: "pdf-to-excel",
    name: "PDF to Excel Converter",
    provider: "91AI Tools",
    serviceUrl: "https://www.91aitool.cn/tools/pdf-to-excel",
    privacyNotice:
      "External service: Files are processed on external servers. Do not upload sensitive confidential documents.",
    freeTier: true,
    requiresUpload: true,
  },
  "cad-to-pdf": {
    id: "cad-to-pdf",
    name: "CAD to PDF Converter",
    provider: "91AI Tools",
    serviceUrl: "https://www.91aitool.cn/tools/cad-to-pdf",
    privacyNotice: "External service: CAD drawings (DWG/DXF) are parsed on external servers.",
    freeTier: true,
    requiresUpload: true,
  },
};
