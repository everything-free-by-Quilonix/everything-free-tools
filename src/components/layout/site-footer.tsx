import Link from "next/link";
import type { ReactNode } from "react";

import { Icon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";
import { populatedCategories, toolsInCategory } from "@/tools/registry";

import { BrandMark } from "./site-header";

function FooterLink({ href, children, external }: { href: string; children: ReactNode; external?: boolean }) {
  const className = "inline-flex items-center gap-1 rounded-sm text-fg-muted transition-colors hover:text-fg";
  return external ? (
    <a href={href} className={className}>
      {children}
      <Icon name="arrow-up-right" size={12} className="text-fg-subtle" />
    </a>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

export function SiteFooter() {
  // The largest categories, straight from the registry.
  const categories = populatedCategories()
    .map((category) => ({ category, count: toolsInCategory(category.id).length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <footer className="mt-12 border-t border-border bg-bg-subtle">
      <Container className="grid grid-cols-2 gap-x-6 gap-y-8 py-10 text-sm lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs space-y-3 lg:col-span-1">
          <p className="flex items-center gap-2 font-display font-bold text-fg">
            <BrandMark size={22} />
            {site.name}
          </p>
          <p className="text-fg-muted">{site.tagline}</p>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-fg-subtle">
            <Icon name="lock" size={14} className="mt-0.5 shrink-0 text-success-fg" />
            No account, no analytics, no cookies, no ads. Local tools run entirely in your browser.
          </p>
        </div>

        <nav aria-labelledby="footer-categories">
          <h2 id="footer-categories" className="mb-3 text-xs font-semibold tracking-[0.08em] text-fg uppercase">
            Categories
          </h2>
          <ul className="space-y-2">
            {categories.map(({ category }) => (
              <li key={category.id}>
                <FooterLink href={`/categories/${category.slug}/`}>{category.name}</FooterLink>
              </li>
            ))}
            <li>
              <FooterLink href="/categories/">All categories</FooterLink>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-site">
          <h2 id="footer-site" className="mb-3 text-xs font-semibold tracking-[0.08em] text-fg uppercase">
            Site
          </h2>
          <ul className="space-y-2">
            <li>
              <FooterLink href="/tools/">All tools</FooterLink>
            </li>
            <li>
              <FooterLink href="/privacy/">Privacy</FooterLink>
            </li>
            <li>
              <FooterLink href="/about/">About</FooterLink>
            </li>
            <li>
              <FooterLink href="/accessibility/">Accessibility</FooterLink>
            </li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-project">
          <h2 id="footer-project" className="mb-3 text-xs font-semibold tracking-[0.08em] text-fg uppercase">
            Everything.Free
          </h2>
          <ul className="space-y-2">
            <li>
              <FooterLink href={site.libraryUrl} external>
                Free resources library
              </FooterLink>
            </li>
            <li>
              <FooterLink href={site.repositoryUrl} external>
                Source code
              </FooterLink>
            </li>
            <li>
              <FooterLink href={site.issuesUrl} external>
                Request a tool
              </FooterLink>
            </li>
          </ul>
        </nav>
      </Container>
      <Container>
        <div className="flex flex-col gap-1 border-t border-border py-5 text-xs text-fg-subtle sm:flex-row sm:justify-between">
          <p>{site.legalName}. Open source under the MIT licence.</p>
          <p>
            Press <kbd className="font-medium text-fg-muted">/</kbd> or{" "}
            <kbd className="font-medium text-fg-muted">Ctrl K</kbd> to search.
          </p>
        </div>
      </Container>
    </footer>
  );
}
