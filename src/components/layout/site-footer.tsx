import Link from "next/link";

import { Container } from "@/components/ui/container";
import { site } from "@/config/site";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-subtle">
      <Container className="flex flex-col gap-6 py-8 text-sm text-fg-muted sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm space-y-1.5">
          <p className="font-medium text-fg">{site.name}</p>
          <p>{site.tagline}</p>
          <p className="text-fg-subtle">No account, no tracking, no ads. Local tools run entirely in your browser.</p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 gap-y-2">
            <li>
              <Link href="/tools/" className="hover:text-fg">
                All tools
              </Link>
            </li>
            <li>
              <Link href="/privacy/" className="hover:text-fg">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/about/" className="hover:text-fg">
                About
              </Link>
            </li>
            <li>
              <Link href="/accessibility/" className="hover:text-fg">
                Accessibility
              </Link>
            </li>
            <li>
              <a href={site.libraryUrl} className="hover:text-fg">
                Free resources library
              </a>
            </li>
            <li>
              <a href={site.repositoryUrl} className="hover:text-fg">
                Source code
              </a>
            </li>
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
