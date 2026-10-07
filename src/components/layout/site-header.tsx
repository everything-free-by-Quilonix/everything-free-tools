import Link from "next/link";

import { Icon } from "@/components/icons";
import { SearchTrigger } from "@/components/search/search-host";
import { Container } from "@/components/ui/container";
import { withBasePath } from "@/config/deployment";
import { NAV_ITEMS } from "@/config/navigation";
import { site } from "@/config/site";

import { MobileMenu, MobileNavLink, NavLink, ShortcutHint } from "./header-parts";
import { ThemeToggle } from "./theme-toggle";

/** The Everything.Free mark, drawn from the site icon (src/app/icon.svg) unchanged. */
export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false" className="shrink-0">
      <rect width="32" height="32" rx="7" className="fill-[#d4af37]" />
      <path
        d="M8 9h9v2.6h-6v3.1h5.4v2.6H11v3.1h6V23H8zM19 9h7v2.6h-4v3.1h3.6v2.6H22V23h-3z"
        className="fill-[#0a0a0f]"
      />
    </svg>
  );
}

/**
 * Site header: brand, the two ways in (Tools, Categories), search and theme.
 * 56 px tall and sticky, so search is always one click or Ctrl+K away.
 */
export function SiteHeader() {
  const searchHref = withBasePath("/tools/");
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur-sm supports-[backdrop-filter]:bg-bg/80">
      <Container>
        <div className="flex h-14 items-center gap-2">
          <Link
            href="/"
            className="-ml-1 flex items-center gap-2.5 rounded-md px-1 py-1 font-display text-[0.9375rem] font-bold tracking-tight whitespace-nowrap text-fg"
          >
            <BrandMark />
            <span>
              Everything.Free <span className="text-accent-text max-sm:sr-only">Tools</span>
            </span>
            <span className="sr-only">, home</span>
          </Link>

          <nav aria-label="Main" className="ml-4 hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <NavLink href={item.href} section={item.section}>
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <SearchTrigger
              href={searchHref}
              className="hidden h-9 w-60 items-center gap-2 rounded-(--radius) border border-border-strong bg-surface px-3 text-sm text-fg-subtle transition-colors hover:border-fg-subtle hover:text-fg-muted md:flex lg:w-72"
            >
              <Icon name="search" size={16} />
              <span className="flex-1">Search tools…</span>
              <ShortcutHint />
            </SearchTrigger>
            <SearchTrigger
              href={searchHref}
              label="Search tools"
              className="inline-flex size-10 items-center justify-center rounded-(--radius) text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg md:hidden"
            >
              <Icon name="search" size={20} />
            </SearchTrigger>
            <ThemeToggle className="max-md:hidden" />
            <MobileMenu>
              <nav aria-label="Main menu">
                <ul>
                  <li>
                    <MobileNavLink href="/tools/" section="/tools" description="Every tool, with search and filters">
                      All tools
                    </MobileNavLink>
                  </li>
                  <li>
                    <MobileNavLink href="/categories/" section="/categories" description="Browse by kind of task">
                      Categories
                    </MobileNavLink>
                  </li>
                  <li className="my-1 border-t border-border" aria-hidden="true" />
                  <li>
                    <MobileNavLink href="/privacy/" section="/privacy">
                      Privacy
                    </MobileNavLink>
                  </li>
                  <li>
                    <MobileNavLink href="/about/" section="/about">
                      About
                    </MobileNavLink>
                  </li>
                </ul>
              </nav>
              <div className="mt-1 flex items-center justify-between border-t border-border pt-1 pl-3">
                <span className="text-sm text-fg-muted">Theme</span>
                <ThemeToggle />
              </div>
              <p className="border-t border-border px-3 pt-2.5 pb-1 text-xs text-fg-subtle">{site.tagline}</p>
            </MobileMenu>
          </div>
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
