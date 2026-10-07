import Link from "next/link";

import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { HeroSearch } from "@/components/search/hero-search";
import { categoryIcons, ToolGrid } from "@/components/tool/tool-card";
import { Container } from "@/components/ui/container";
import { SectionHeading, TextLink } from "@/components/ui/navigation";
import { withBasePath } from "@/config/deployment";
import { ESSENTIAL_TOOLS, HERO_TASKS } from "@/config/discovery";
import { site } from "@/config/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { toSummary } from "@/lib/tool-summary";
import { getTool, populatedCategories, tools, toolsInCategory } from "@/tools/registry";

export const metadata = buildMetadata({ description: site.description, path: "/" });

export default function HomePage() {
  const summaries = tools.map(toSummary);
  const essentials = ESSENTIAL_TOOLS.flatMap((slug) => {
    const tool = getTool(slug);
    return tool ? [toSummary(tool)] : [];
  });
  const categories = populatedCategories()
    .map((category) => ({ category, count: toolsInCategory(category.id).length }))
    .sort((a, b) => b.count - a.count || a.category.name.localeCompare(b.category.name));
  const localCount = tools.filter((tool) => tool.processing === "LOCAL").length;

  return (
    <>
      <section className="border-b border-border bg-bg-subtle">
        <Container className="pt-12 pb-10 sm:pt-20 sm:pb-14">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold tracking-[0.14em] text-accent-text uppercase">Everything.Free Tools</p>
            <h1 className="mt-4 font-display text-[2rem] leading-[1.1] font-bold tracking-tight text-fg sm:text-5xl">
              Useful tools.
              <br />
              <span className="text-fg-muted">No unnecessary steps.</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-fg-muted">
              Free browser-based tools for developers, creators, students and everyday tasks.
            </p>
            <div className="mt-8 text-left">
              <HeroSearch action={withBasePath("/tools/")} tools={summaries} />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-fg-subtle">Try</span>
              {HERO_TASKS.flatMap((task) => {
                const tool = getTool(task.slug);
                return tool
                  ? [
                      <Link
                        key={task.slug}
                        href={`/tools/${tool.slug}/`}
                        className="rounded-full border border-border bg-surface px-3 py-1 text-fg-muted transition-colors hover:border-border-strong hover:text-fg"
                      >
                        {task.label}
                      </Link>,
                    ]
                  : [];
              })}
            </div>
          </div>
          <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-fg-subtle">
            <li className="flex items-center gap-1.5">
              <Icon name="grid" size={14} />
              {tools.length} tools
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="lock" size={14} className="text-success-fg" />
              {localCount === tools.length
                ? "All processed in your browser"
                : `${localCount} processed in your browser`}
            </li>
            <li className="flex items-center gap-1.5">
              <Icon name="check" size={14} />
              No account, no limits
            </li>
          </ul>
        </Container>
      </section>

      <Container className="space-y-16 py-14">
        <section aria-labelledby="essentials">
          <SectionHeading
            id="essentials"
            title="Essential tools"
            description="A good place to start."
            action={<TextLink href="/tools/">All {tools.length} tools</TextLink>}
          />
          <ToolGrid tools={essentials} columns={4} />
        </section>

        <section aria-labelledby="categories">
          <SectionHeading
            id="categories"
            title="Explore by category"
            action={<TextLink href="/categories/">All categories</TextLink>}
          />
          <ul className="grid grid-cols-1 overflow-hidden rounded-(--radius-lg) border border-border bg-surface sm:grid-cols-2 lg:grid-cols-4">
            {categories.map(({ category, count }) => (
              <li key={category.id} className="-mt-px -ml-px border-t border-l border-border">
                <Link
                  href={`/categories/${category.slug}/`}
                  className="group flex h-full items-center gap-3 px-4 py-4 transition-colors hover:bg-surface-raised focus-visible:-outline-offset-2"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-(--radius) border border-border bg-surface-raised text-fg-muted group-hover:text-accent-text">
                    <Icon name={categoryIcons[category.id]} size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-fg">{category.name}</span>
                    <span className="block text-xs text-fg-muted">{category.tagline}</span>
                  </span>
                  <span className="text-xs text-fg-subtle tabular-nums">
                    {count}
                    <span className="sr-only">{count === 1 ? " tool" : " tools"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="how" className="rounded-(--radius-lg) border border-border">
          <h2 id="how" className="sr-only">
            How these tools work
          </h2>
          <ul className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                icon: "lock" as const,
                title: "Your data stays with you",
                body: "Local tools process files and text on your device. A strict security policy stops pages from sending them anywhere.",
              },
              {
                icon: "check" as const,
                title: "No account, no limits",
                body: "Nothing to sign up for, no daily quota and no watermark. The only limits are your device's.",
              },
              {
                icon: "code" as const,
                title: "Open source",
                body: "The code is public, so anyone can check exactly what each tool does.",
              },
            ].map((point) => (
              <li key={point.title} className="p-5">
                <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Icon name={point.icon} size={16} className="text-success-fg" />
                  {point.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{point.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </Container>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: absoluteUrl("/"),
          description: site.description,
          publisher: { "@type": "Organization", name: site.parent.name, url: site.parent.url },
          potentialAction: {
            "@type": "SearchAction",
            target: `${absoluteUrl("/tools/")}?q={query}`,
            "query-input": "required name=query",
          },
        }}
      />
    </>
  );
}
