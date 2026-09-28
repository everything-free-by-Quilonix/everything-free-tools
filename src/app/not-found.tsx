import Link from "next/link";

import { buttonClasses } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export const metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <Container className="py-20 text-center">
      <p className="text-sm font-medium text-accent">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-fg">This page doesn&rsquo;t exist</h1>
      <p className="mt-3 text-fg-muted">The link may be old, or the address may have a typo.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className={buttonClasses()}>
          Go to the home page
        </Link>
        <Link href="/tools/" className={buttonClasses({ variant: "secondary" })}>
          See all tools
        </Link>
      </div>
    </Container>
  );
}
