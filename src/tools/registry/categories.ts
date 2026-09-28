import { CATEGORY_IDS, type ToolCategory, type ToolCategoryId } from "./types";

/**
 * Categories people understand. Fifteen, and only fifteen: a category is where
 * someone would look for a task, not a taxonomy of implementation details.
 * A category gets a page only once it has at least one tool.
 */
export const categories: Record<ToolCategoryId, ToolCategory> = {
  image: { id: "image", slug: "image", name: "Image", description: "Compress, resize, crop and convert pictures." },
  pdf: { id: "pdf", slug: "pdf", name: "PDF", description: "Work with PDF documents." },
  text: { id: "text", slug: "text", name: "Text", description: "Count, clean up and transform text." },
  developer: {
    id: "developer",
    slug: "developer",
    name: "Developer",
    description: "Formatters, encoders and generators for everyday development.",
  },
  data: { id: "data", slug: "data", name: "Data", description: "Validate and convert JSON, CSV and other formats." },
  files: { id: "files", slug: "files", name: "Files", description: "Inspect and fingerprint files." },
  security: {
    id: "security",
    slug: "security",
    name: "Security",
    description: "Hashes, passwords and random identifiers, explained plainly.",
  },
  "qr-barcode": {
    id: "qr-barcode",
    slug: "qr-barcode",
    name: "QR & Barcode",
    description: "Create QR codes for links, text and Wi-Fi networks.",
  },
  audio: { id: "audio", slug: "audio", name: "Audio", description: "Work with sound files." },
  video: { id: "video", slug: "video", name: "Video", description: "Work with video files." },
  math: { id: "math", slug: "math", name: "Math", description: "Calculators and number tools." },
  "color-design": {
    id: "color-design",
    slug: "color-design",
    name: "Color & Design",
    description: "Colour conversion and design helpers.",
  },
  accessibility: {
    id: "accessibility",
    slug: "accessibility",
    name: "Accessibility",
    description: "Checks that help make things usable by everyone.",
  },
  education: { id: "education", slug: "education", name: "Education", description: "Tools for learning and study." },
  everyday: {
    id: "everyday",
    slug: "everyday",
    name: "Everyday",
    description: "Small jobs that come up all the time.",
  },
};

export const categoryList: ToolCategory[] = CATEGORY_IDS.map((id) => categories[id]);

export function getCategory(id: ToolCategoryId): ToolCategory {
  return categories[id];
}

export function getCategoryBySlug(slug: string): ToolCategory | undefined {
  return categoryList.find((category) => category.slug === slug);
}
