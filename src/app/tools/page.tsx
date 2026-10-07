import { Suspense } from "react";

import { DirectoryView, ToolDirectory, type DirectoryCategory } from "@/components/tool/tool-directory";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/navigation";
import { buildMetadata } from "@/lib/seo";
import { toSummary } from "@/lib/tool-summary";
import { populatedCategories, tools, toolsInCategory } from "@/tools/registry";

export const metadata = buildMetadata({
  title: "All tools",
  description: "Every Everything.Free tool in one place: search, filter by category and see where each one runs.",
  path: "/tools/",
});

export default function ToolsPage() {
  const summaries = tools.map(toSummary);
  // Largest categories first, as on the home page.
  const categories: DirectoryCategory[] = populatedCategories()
    .map((category) => ({ category, count: toolsInCategory(category.id).length }))
    .sort((a, b) => b.count - a.count || a.category.name.localeCompare(b.category.name))
    .map(({ category }) => ({ id: category.id, slug: category.slug, name: category.name }));

  return (
    <Container className="py-10 sm:py-12">
      <PageHeader eyebrow="Directory" title="All tools" className="mb-8">
        Search by what you want to do, like &ldquo;compress image&rdquo; or &ldquo;format json&rdquo;, or narrow the
        list with filters.
      </PageHeader>
      {/*
        The search reads ?q= and the filters from the address bar, which only exists
        in the browser. The static HTML lists every tool, so the page is complete
        without JavaScript.
      */}
      <Suspense fallback={<DirectoryView tools={summaries} categories={categories} />}>
        <ToolDirectory tools={summaries} categories={categories} />
      </Suspense>
    </Container>
  );
}
