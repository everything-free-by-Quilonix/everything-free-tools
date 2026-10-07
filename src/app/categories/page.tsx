import Link from "next/link";

import { Icon } from "@/components/icons";
import { categoryIcons } from "@/components/tool/tool-card";
import { Container } from "@/components/ui/container";
import { Breadcrumbs, PageHeader } from "@/components/ui/navigation";
import { buildMetadata } from "@/lib/seo";
import { categoryList, populatedCategories, tools, toolsInCategory } from "@/tools/registry";

export const metadata = buildMetadata({
  title: "Categories",
  description: "Browse Everything.Free tools by kind of task: developer, data, text, image, security and more.",
  path: "/categories/",
});

export default function CategoriesPage() {
  const categories = populatedCategories()
    .map((category) => ({ category, list: toolsInCategory(category.id) }))
    .sort((a, b) => b.list.length - a.list.length || a.category.name.localeCompare(b.category.name));
  const populated = new Set(categories.map(({ category }) => category.id));
  const planned = categoryList.filter((category) => !populated.has(category.id));

  return (
    <Container className="py-10 sm:py-12">
      <Breadcrumbs items={[{ name: "Categories" }]} className="mb-6" />
      <PageHeader title="Categories" className="mb-10">
        {tools.length} tools in {categories.length} categories. A tool can appear in more than one.
      </PageHeader>

      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {categories.map(({ category, list }) => (
          <li key={category.id}>
            <section
              aria-labelledby={`cat-${category.slug}`}
              className="flex h-full flex-col rounded-(--radius-lg) border border-border bg-surface"
            >
              <div className="flex items-start gap-3 border-b border-border p-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-(--radius) border border-border bg-surface-raised text-accent-text">
                  <Icon name={categoryIcons[category.id]} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id={`cat-${category.slug}`} className="font-display text-base font-semibold text-fg">
                    <Link
                      href={`/categories/${category.slug}/`}
                      className="rounded-sm hover:underline hover:underline-offset-2"
                    >
                      {category.name}
                    </Link>
                  </h2>
                  <p className="text-sm text-fg-muted">{category.description}</p>
                </div>
                <span className="text-xs text-fg-subtle tabular-nums">
                  {list.length}
                  <span className="sr-only">{list.length === 1 ? " tool" : " tools"}</span>
                </span>
              </div>
              <ul className="flex-1 space-y-0.5 p-2">
                {list.slice(0, 5).map((tool) => (
                  <li key={tool.slug}>
                    <Link
                      href={`/tools/${tool.slug}/`}
                      className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg"
                    >
                      <span className="truncate">{tool.name}</span>
                      <Icon name="chevron-right" size={14} className="shrink-0 text-fg-subtle" />
                    </Link>
                  </li>
                ))}
              </ul>
              {list.length > 5 ? (
                <Link
                  href={`/categories/${category.slug}/`}
                  className="border-t border-border px-4 py-2.5 text-sm font-medium text-accent-text hover:bg-surface-raised"
                >
                  All {list.length} {category.name.toLowerCase()} tools
                </Link>
              ) : null}
            </section>
          </li>
        ))}
      </ul>

      {planned.length > 0 ? (
        <p className="mt-10 text-sm text-fg-subtle">
          Not available yet: {planned.map((category) => category.name).join(", ")}. These get a page once they have a
          tool that works.
        </p>
      ) : null}
    </Container>
  );
}
