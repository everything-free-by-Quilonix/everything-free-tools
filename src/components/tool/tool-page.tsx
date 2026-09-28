import Link from "next/link";

import { Icon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { getCategory, relatedTools, type ToolDefinition } from "@/tools/registry";
import { ToolWorkspace } from "@/tools/workspaces";

import { PrivacyNotice } from "./privacy-notice";
import { ToolGrid } from "./tool-card";

/**
 * The page every tool shares, in a fixed order: breadcrumb, title, explanation,
 * privacy, workspace (which holds the result), limitations, how it works, related
 * tools. Only the workspace differs between tools; everything else is read from
 * the registry.
 */
export function ToolPage({ tool }: { tool: ToolDefinition }) {
  const category = getCategory(tool.category);
  const related = relatedTools(tool);

  return (
    <Container className="py-6 sm:py-10">
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
            <Link href={`/categories/${category.slug}/`} className="hover:text-fg">
              {category.name}
            </Link>
          </li>
          <li aria-hidden="true">
            <Icon name="chevron-right" size={14} />
          </li>
          <li>
            <span aria-current="page" className="text-fg">
              {tool.name}
            </span>
          </li>
        </ol>
      </nav>

      <header className="max-w-(--container-prose) space-y-2">
        <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">{tool.name}</h1>
        <p className="text-base text-fg-muted">{tool.description}</p>
      </header>

      <PrivacyNotice tool={tool} className="mt-5" />

      <section aria-label={`${tool.name} workspace`} className="mt-6">
        <noscript>
          <p className="mb-4 rounded-[var(--radius)] border border-warning/40 bg-warning-soft p-3 text-sm text-fg">
            This tool runs in your browser, so it needs JavaScript. Turn JavaScript on for this site to use it.
          </p>
        </noscript>
        <ToolWorkspace slug={tool.slug} required={tool.capabilities.required} />
      </section>

      <div className="mt-12 grid gap-8 md:grid-cols-2">
        <section aria-labelledby="limitations">
          <h2 id="limitations" className="font-display text-lg font-semibold text-fg">
            Limitations
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-fg-muted marker:text-fg-subtle">
            {tool.limitations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section aria-labelledby="how-it-works">
          <h2 id="how-it-works" className="font-display text-lg font-semibold text-fg">
            How it works
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-fg-muted marker:text-fg-subtle">
            {tool.howItWorks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
          {tool.dependencies?.length ? (
            <p className="mt-3 text-xs text-fg-subtle">
              Uses{" "}
              {tool.dependencies.map((dependency, index) => (
                <span key={dependency.name}>
                  {index > 0 ? ", " : ""}
                  <a href={dependency.url} className="underline underline-offset-2 hover:text-fg">
                    {dependency.name}
                  </a>{" "}
                  ({dependency.license})
                </span>
              ))}
              .
            </p>
          ) : null}
        </section>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="mt-12">
          <h2 id="related" className="mb-4 font-display text-lg font-semibold text-fg">
            Related tools
          </h2>
          <ToolGrid tools={related} />
        </section>
      ) : null}
    </Container>
  );
}
