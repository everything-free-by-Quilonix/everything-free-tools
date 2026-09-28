import Link from "next/link";

import { Icon } from "@/components/icons";
import { Container } from "@/components/ui/container";
import { site } from "@/config/site";

/**
 * Site header. A server component with plain links: no JavaScript is needed to
 * navigate, and the whole navigation fits on a phone without a menu button.
 */
export function SiteHeader() {
  return (
    <header className="border-b border-border bg-bg/90">
      <Container>
        <div className="flex h-16 items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-md font-display text-sm font-bold whitespace-nowrap text-fg sm:text-base"
          >
            <span
              aria-hidden="true"
              className="grid size-7 place-items-center rounded-md bg-accent text-xs font-extrabold text-accent-fg"
            >
              EF
            </span>
            <span>
              Everything.Free <span className="text-accent">Tools</span>
            </span>
          </Link>
          <nav aria-label="Main" className="ml-auto">
            <ul className="flex items-center gap-1 text-sm">
              <li>
                <Link
                  href="/tools/"
                  className="inline-flex h-10 items-center gap-1.5 rounded-md px-2 whitespace-nowrap text-fg-muted hover:bg-surface-hover hover:text-fg sm:px-3"
                >
                  <Icon name="grid" size={16} className="hidden sm:block" />
                  All tools
                </Link>
              </li>
              <li className="hidden sm:block">
                <a
                  href={site.libraryUrl}
                  className="inline-flex h-10 items-center rounded-md px-3 text-fg-muted hover:bg-surface-hover hover:text-fg"
                >
                  Free resources
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </header>
  );
}

/** First focusable element: jumps past the header to the content (WCAG 2.4.1). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to main content
    </a>
  );
}
