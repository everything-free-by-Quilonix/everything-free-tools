import Link from "next/link";

import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { categoryIcons } from "@/components/tool/tool-card";
import { SearchForm } from "@/components/tool/tool-search";
import { Container } from "@/components/ui/container";
import { withBasePath } from "@/config/deployment";
import { site } from "@/config/site";
import { absoluteUrl, buildMetadata } from "@/lib/seo";
import { getTool, populatedCategories, toolsInCategory } from "@/tools/registry";

export const metadata = buildMetadata({ description: site.description, path: "/" });

/**
 * Popular tasks, chosen by hand. There are no usage numbers behind this list,
 * because nothing is measured; it is simply the jobs people most often need.
 */
const POPULAR_TASKS = [
  { label: "Compress an image", slug: "image-compressor" },
  { label: "Format or validate JSON", slug: "json-formatter" },
  { label: "Make a QR code for Wi-Fi", slug: "qr-generator" },
  { label: "Count words and characters", slug: "text-counter" },
  { label: "Generate a UUID", slug: "uuid-generator" },
  { label: "Decode Base64", slug: "base64" },
] as const;

export default function HomePage() {
  const categories = populatedCategories();

  return (
    <>
      <section className="border-b border-border bg-bg-subtle">
        <Container className="py-12 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="mb-3 text-sm font-medium text-accent">{site.tagline}</p>
            <h1 className="font-display text-4xl font-bold text-fg sm:text-5xl">What do you want to do?</h1>
            <p className="mt-4 text-base text-fg-muted">
              Free tools that run in your browser. No account, no upload for local tools, no artificial limits.
            </p>
            <div className="mt-8 text-left">
              <SearchForm action={withBasePath("/tools/")} size="lg" />
            </div>
          </div>
        </Container>
      </section>

      <Container className="space-y-14 py-12">
        <section aria-labelledby="popular">
          <h2 id="popular" className="font-display text-xl font-semibold text-fg">
            Popular tasks
          </h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {POPULAR_TASKS.map((task) => {
              const tool = getTool(task.slug);
              if (!tool) return null;
              return (
                <li key={task.label}>
                  <Link
                    href={`/tools/${tool.slug}/`}
                    className="flex min-h-14 items-center justify-between gap-3 rounded-[var(--radius)] border border-border bg-surface px-4 py-3 text-sm text-fg transition-colors hover:border-border-strong hover:bg-surface-raised"
                  >
                    <span className="flex items-center gap-3">
                      <Icon name={categoryIcons[tool.category]} size={18} className="text-accent" />
                      {task.label}
                    </span>
                    <Icon name="arrow-right" size={16} className="text-fg-subtle" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="categories">
          <h2 id="categories" className="font-display text-xl font-semibold text-fg">
            Explore by category
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const count = toolsInCategory(category.id).length;
              return (
                <li key={category.id}>
                  <Link
                    href={`/categories/${category.slug}/`}
                    className="flex h-full flex-col gap-1.5 rounded-[var(--radius)] border border-border bg-surface p-4 transition-colors hover:border-border-strong hover:bg-surface-raised"
                  >
                    <span className="flex items-center gap-2 font-display font-semibold text-fg">
                      <Icon name={categoryIcons[category.id]} size={18} className="text-accent" />
                      {category.name}
                    </span>
                    <span className="text-sm text-fg-muted">{category.description}</span>
                    <span className="text-xs text-fg-subtle">
                      {count} {count === 1 ? "tool" : "tools"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm">
            <Link href="/tools/" className="text-accent underline underline-offset-2 hover:text-accent-hover">
              See all tools
            </Link>
          </p>
        </section>

        <section aria-labelledby="how" className="grid gap-4 sm:grid-cols-3">
          <h2 id="how" className="sr-only">
            How these tools work
          </h2>
          {[
            {
              icon: "lock" as const,
              title: "Your files stay with you",
              body: "Every tool here runs in your browser. Files and text are processed on your device and never uploaded.",
            },
            {
              icon: "check" as const,
              title: "No account, no limits",
              body: "Nothing to sign up for, no daily quota and no watermark. The only limits are your device's.",
            },
            {
              icon: "code" as const,
              title: "Open source",
              body: "The code is public, so anyone can check what each tool does.",
            },
          ].map((point) => (
            <div key={point.title} className="rounded-[var(--radius)] border border-border bg-surface p-4">
              <Icon name={point.icon} size={20} className="text-success-fg" />
              <h3 className="mt-2 font-display font-semibold text-fg">{point.title}</h3>
              <p className="mt-1 text-sm text-fg-muted">{point.body}</p>
            </div>
          ))}
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
