import Link from "next/link";
import { notFound } from "next/navigation";

import { Icon } from "@/components/icons";
import { ToolGrid } from "@/components/tool/tool-card";
import { Container } from "@/components/ui/container";
import { buildMetadata } from "@/lib/seo";
import { getCategoryBySlug, populatedCategories, toolsInCategory } from "@/tools/registry";

export const dynamicParams = false;

/** Only categories with tools get a page: no empty shelves. */
export function generateStaticParams() {
  return populatedCategories().map((category) => ({ category: category.slug }));
}

type Props = { params: Promise<{ category: string }> };

export async function generateMetadata({ params }: Props) {
  const category = getCategoryBySlug((await params).category);
  if (!category) return {};
  return buildMetadata({
    title: `${category.name} tools`,
    description: `${category.description} Free, no account, processed in your browser.`,
    path: `/categories/${category.slug}/`,
  });
}

export default async function CategoryPage({ params }: Props) {
  const category = getCategoryBySlug((await params).category);
  if (!category) notFound();
  const list = toolsInCategory(category.id);
  if (list.length === 0) notFound();

  return (
    <Container className="py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-fg-muted">
        <ol className="flex flex-wrap items-center gap-1">
          <li>
            <Link href="/" className="hover:text-fg">
              Home
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevron-right" size={14} />
          </li>
          <li>
            <span aria-current="page" className="text-fg">
              {category.name}
            </span>
          </li>
        </ol>
      </nav>
      <h1 className="font-display text-3xl font-bold text-fg">{category.name} tools</h1>
      <p className="mt-2 text-fg-muted">{category.description}</p>
      <div className="mt-8">
        <ToolGrid tools={list} headingLevel={2} />
      </div>
    </Container>
  );
}
