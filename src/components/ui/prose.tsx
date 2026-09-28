import type { ReactNode } from "react";

import { Container } from "./container";

/** Long-form page layout for About, Privacy and Accessibility. */
export function ProsePage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <Container className="py-10">
      <article className="max-w-(--container-prose) space-y-8">
        <header className="space-y-3">
          <h1 className="font-display text-3xl font-bold text-fg sm:text-4xl">{title}</h1>
          <p className="text-base text-fg-muted">{intro}</p>
        </header>
        {children}
      </article>
    </Container>
  );
}

export function ProseSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-fg-muted [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_strong]:text-fg [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
      <h2 className="font-display text-xl font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}
