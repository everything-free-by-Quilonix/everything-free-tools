import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { cn } from "@/lib/cn";
import { absoluteUrl } from "@/lib/seo";

export { Kbd } from "./kbd";

export interface Crumb {
  name: string;
  /** Root-relative path. The last crumb is the current page and has none. */
  href?: string;
}

/**
 * Breadcrumb trail, with matching BreadcrumbList structured data so search engines
 * show the same path people see.
 */
export function Breadcrumbs({ items, className }: { items: readonly Crumb[]; className?: string }) {
  const trail: Crumb[] = [{ name: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-sm text-fg-muted", className)}>
        <ol className="flex flex-wrap items-center gap-1">
          {trail.map((crumb, index) => {
            const last = index === trail.length - 1;
            return (
              <li key={`${crumb.name}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <Icon name="chevron-right" size={14} className="text-fg-subtle" /> : null}
                {last || !crumb.href ? (
                  <span aria-current={last ? "page" : undefined} className="text-fg">
                    {crumb.name}
                  </span>
                ) : (
                  <Link href={crumb.href} className="rounded-sm hover:text-fg hover:underline hover:underline-offset-2">
                    {crumb.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
          })),
        }}
      />
    </>
  );
}

/** The title block every listing page shares: eyebrow, heading, one line of context. */
export function PageHeader({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("max-w-(--container-prose)", className)}>
      {eyebrow ? (
        <p className="mb-2 text-xs font-semibold tracking-[0.12em] text-accent-text uppercase">{eyebrow}</p>
      ) : null}
      <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
      {children ? <div className="mt-3 text-base leading-relaxed text-fg-muted">{children}</div> : null}
    </header>
  );
}

/** A section heading with an optional link on the right ("See all"). */
export function SectionHeading({
  id,
  title,
  action,
  description,
}: {
  id: string;
  title: ReactNode;
  action?: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
      <div>
        <h2 id={id} className="font-display text-lg font-semibold text-fg">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-sm text-fg-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-accent-text hover:underline hover:underline-offset-2"
    >
      {children}
      <Icon name="arrow-right" size={14} />
    </Link>
  );
}
