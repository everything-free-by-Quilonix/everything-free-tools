import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/icons";
import { CategoryTools } from "@/components/tool/category-tools";
import { ProcessingBadge } from "@/components/tool/privacy-notice";
import { categoryIcons, ToolGrid } from "@/components/tool/tool-card";
import { Container } from "@/components/ui/container";
import { Breadcrumbs, SectionHeading } from "@/components/ui/navigation";
import { CATEGORY_HIGHLIGHTS } from "@/config/discovery";
import { buildMetadata } from "@/lib/seo";
import { toSummary } from "@/lib/tool-summary";
import {
  getCategoryBySlug,
  populatedCategories,
  relatedCategories,
  toolsInCategory,
  type ToolDefinition,
} from "@/tools/registry";

export const dynamicParams = false;

/** Only categories with tools get a page: no empty shelves. */
export function generateStaticParams() {
  return populatedCategories().map((category) => ({ category: category.slug }));
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const category = getCategoryBySlug((await params).category);
  if (!category) return {};
  const count = toolsInCategory(category.id).length;
  return buildMetadata({
    title: `${category.name} tools`,
    description: `${category.description} ${count} free ${count === 1 ? "tool" : "tools"}, no account, processed in your browser.`,
    path: `/categories/${category.slug}/`,
  });
}

/** The tools a category leads with: curated if configured, otherwise its first tools. */
function highlightsFor(list: ToolDefinition[], curated: readonly string[] | undefined): ToolDefinition[] {
  const chosen = (curated ?? []).flatMap((slug) => list.filter((tool) => tool.slug === slug));
  for (const tool of list) if (chosen.length < 3 && !chosen.includes(tool)) chosen.push(tool);
  return chosen.slice(0, 3);
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategoryBySlug((await params).category);
  if (!category) notFound();
  const list = toolsInCategory(category.id);
  if (list.length === 0) notFound();

  const highlights = list.length > 4 ? highlightsFor(list, CATEGORY_HIGHLIGHTS[category.id]) : [];
  const related = relatedCategories(category.id);
  const local = list.filter((tool) => tool.processing === "LOCAL").length;

  return (
    <>
      <section className="border-b border-border bg-bg-subtle">
        <Container className="py-8 sm:py-12">
          <Breadcrumbs items={[{ name: "Categories", href: "/categories/" }, { name: category.name }]} />
          <div className="mt-6 flex items-start gap-4">
            <span className="hidden size-12 shrink-0 place-items-center rounded-(--radius-lg) border border-border-strong bg-surface text-accent-text sm:grid">
              <Icon name={categoryIcons[category.id]} size={24} />
            </span>
            <div className="max-w-(--container-prose)">
              <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
                {category.name} tools
              </h1>
              <p className="mt-2 text-base leading-relaxed text-fg-muted">{category.description}</p>
              <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-fg-subtle">
                <span>
                  {list.length} {list.length === 1 ? "tool" : "tools"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ProcessingBadge kind="local" />
                  <span>
                    {local === list.length ? "every one runs in your browser" : `${local} run in your browser`}
                  </span>
                </span>
              </p>
            </div>
          </div>
        </Container>
      </section>

      <Container className="space-y-14 py-10 sm:py-12">
        {highlights.length > 0 ? (
          <section aria-labelledby="start-here">
            <SectionHeading
              id="start-here"
              title="Start here"
              description={`Common ${category.name.toLowerCase()} jobs.`}
            />
            <ToolGrid tools={highlights.map(toSummary)} showCategory={false} />
          </section>
        ) : null}

        <CategoryTools tools={list.map(toSummary)} categoryName={category.name} headingId="all-tools" />

        {related.length > 0 ? (
          <section aria-labelledby="related-categories">
            <SectionHeading id="related-categories" title="Related categories" />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((other) => {
                const count = toolsInCategory(other.id).length;
                return (
                  <li key={other.id}>
                    <Link
                      href={`/categories/${other.slug}/`}
                      className="group flex h-full items-center gap-3 rounded-(--radius-lg) border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong hover:bg-surface-raised"
                    >
                      <Icon
                        name={categoryIcons[other.id]}
                        size={18}
                        className="text-fg-subtle group-hover:text-accent-text"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-fg">{other.name}</span>
                        <span className="block text-xs text-fg-muted">
                          {other.tagline} · {count} {count === 1 ? "tool" : "tools"}
                        </span>
                      </span>
                      <Icon name="chevron-right" size={16} className="text-fg-subtle" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  );
}
