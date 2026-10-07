import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/icons";
import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Breadcrumbs } from "@/components/ui/navigation";
import { processingKind, processingLabels } from "@/lib/processing";
import { toSummary } from "@/lib/tool-summary";
import { getCategory, relatedTools, type ToolDefinition } from "@/tools/registry";
import { ToolWorkspace } from "@/tools/workspaces";

import { PrivacyNotice, ProcessingBadge } from "./privacy-notice";
import { categoryIcons, ToolGrid } from "./tool-card";

/**
 * The page every tool shares. The tool itself comes first: breadcrumb, a compact
 * title, the privacy indicator (before anything can be pasted or uploaded), then
 * the workspace. Explanation, details and related tools follow below it. Only the
 * workspace differs between tools; everything else is read from the registry.
 */
export function ToolPage({ tool }: { tool: ToolDefinition }) {
  const category = getCategory(tool.category);
  const related = relatedTools(tool, 6).map(toSummary);
  const kind = processingKind(tool);
  const formats = tool.supportedFormats ?? [];

  return (
    <Container className="py-6 sm:py-8">
      <Breadcrumbs
        items={[{ name: category.name, href: `/categories/${category.slug}/` }, { name: tool.name }]}
        className="mb-5"
      />

      <header className="max-w-(--container-prose)">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg sm:text-3xl">{tool.name}</h1>
        <p className="mt-1.5 text-base text-fg-muted">{tool.shortDescription}</p>
      </header>

      <PrivacyNotice tool={tool} className="mt-5" />

      <section aria-label={`${tool.name} workspace`} className="mt-5">
        {kind === "external" ? (
          <ExternalTool tool={tool} />
        ) : (
          <>
            <noscript>
              <p className="mb-4 rounded-(--radius) border border-warning/40 bg-warning-soft p-3 text-sm text-fg">
                This tool runs in your browser, so it needs JavaScript. Turn JavaScript on for this site to use it.
              </p>
            </noscript>
            <ToolWorkspace slug={tool.slug} required={tool.capabilities.required} />
          </>
        )}
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <div className="min-w-0 space-y-10">
          <section aria-labelledby="about-tool">
            <h2 id="about-tool" className="font-display text-lg font-semibold text-fg">
              About this tool
            </h2>
            <p className="mt-3 max-w-(--container-prose) text-sm leading-relaxed text-fg-muted">{tool.description}</p>
          </section>

          <section aria-labelledby="how-it-works">
            <h2 id="how-it-works" className="font-display text-lg font-semibold text-fg">
              How it works
            </h2>
            <ol className="mt-3 max-w-(--container-prose) space-y-2.5">
              {tool.howItWorks.map((item, index) => (
                <li key={item} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
                  <span
                    aria-hidden="true"
                    className="mt-px grid size-5 shrink-0 place-items-center rounded-full border border-border-strong text-2xs font-semibold text-fg-subtle tabular-nums"
                  >
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </section>

          <section aria-labelledby="limitations">
            <h2 id="limitations" className="font-display text-lg font-semibold text-fg">
              Limitations
            </h2>
            <ul className="mt-3 max-w-(--container-prose) list-disc space-y-2 pl-5 text-sm leading-relaxed text-fg-muted marker:text-fg-subtle">
              {tool.limitations.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-labelledby="tool-details" className="lg:pt-1">
          <div className="rounded-(--radius-lg) border border-border bg-surface">
            <h2 id="tool-details" className="border-b border-border px-4 py-3 text-sm font-semibold text-fg">
              Details
            </h2>
            <dl className="divide-y divide-border text-sm">
              <Detail term="Category">
                <Link
                  href={`/categories/${category.slug}/`}
                  className="inline-flex items-center gap-1.5 rounded-sm text-fg hover:underline hover:underline-offset-2"
                >
                  <Icon name={categoryIcons[category.id]} size={14} className="text-fg-subtle" />
                  {category.name}
                </Link>
              </Detail>
              <Detail term="Processing">
                <span className="flex flex-col gap-0.5">
                  <ProcessingBadge kind={kind} />
                  <span className="text-xs text-fg-subtle">{processingLabels[kind].explanation}</span>
                </span>
              </Detail>
              {formats.length > 0 ? (
                <Detail term="Formats">
                  <span className="flex flex-wrap gap-1">
                    {formats.map((format) => (
                      <span
                        key={format}
                        className="rounded border border-border px-1.5 font-mono text-xs text-fg-muted uppercase"
                      >
                        {format}
                      </span>
                    ))}
                  </span>
                </Detail>
              ) : null}
              <Detail term="Account">
                <span className="text-fg-muted">Not needed</span>
              </Detail>
              <Detail term="Licence">
                <span className="text-fg-muted">{tool.license}</span>
              </Detail>
              {tool.dependencies?.length ? (
                <Detail term="Uses">
                  <span className="flex flex-col gap-1">
                    {tool.dependencies.map((dependency) => (
                      <a
                        key={dependency.name}
                        href={dependency.url}
                        className="rounded-sm text-fg-muted underline underline-offset-2 hover:text-fg"
                      >
                        {dependency.name} ({dependency.license})
                      </a>
                    ))}
                  </span>
                </Detail>
              ) : null}
            </dl>
          </div>
        </aside>
      </div>

      {related.length > 0 ? (
        <section aria-labelledby="related" className="mt-14">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <h2 id="related" className="font-display text-lg font-semibold text-fg">
              Related tools
            </h2>
            <Link
              href={`/categories/${category.slug}/`}
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent-text hover:underline hover:underline-offset-2"
            >
              More {category.name.toLowerCase()} tools
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
          <ToolGrid tools={related} />
        </section>
      ) : null}
    </Container>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <dt className="shrink-0 text-fg-subtle">{term}</dt>
      <dd className="min-w-0 text-right">{children}</dd>
    </div>
  );
}

/** An external capability: explained honestly, and opened on its own site. */
function ExternalTool({ tool }: { tool: ToolDefinition }) {
  if (!tool.externalUrl) return null;
  const host = new URL(tool.externalUrl).host;
  return (
    <div className="rounded-(--radius-lg) border border-border bg-surface p-6 text-center sm:p-10">
      <Icon name="arrow-up-right" size={24} className="mx-auto text-info-fg" />
      <p className="mt-3 font-display text-lg font-semibold text-fg">This tool runs on {host}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
        This capability currently uses an external service. Anything you give it is handled under that site&rsquo;s own
        terms, not this site&rsquo;s.
      </p>
      <a
        href={tool.externalUrl}
        rel="noopener noreferrer"
        target="_blank"
        className={buttonClasses({ className: "mt-6" })}
      >
        Open tool
        <Icon name="arrow-up-right" size={16} />
        <span className="sr-only">(opens {host} in a new tab)</span>
      </a>
    </div>
  );
}
