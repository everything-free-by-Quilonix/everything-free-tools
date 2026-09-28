import { Suspense } from "react";

import { ToolGrid } from "@/components/tool/tool-card";
import { SearchForm, ToolSearch } from "@/components/tool/tool-search";
import { Container } from "@/components/ui/container";
import { withBasePath } from "@/config/deployment";
import { buildMetadata } from "@/lib/seo";
import { tools } from "@/tools/registry";

export const metadata = buildMetadata({
  title: "All tools",
  description: "Every Everything.Free tool: free, no account, and processed in your browser.",
  path: "/tools/",
});

export default function ToolsPage() {
  const action = withBasePath("/tools/");
  return (
    <Container className="py-10">
      <h1 className="font-display text-3xl font-bold text-fg">All tools</h1>
      <p className="mt-2 text-fg-muted">Search by what you want to do, like “compress image” or “format json”.</p>
      <div className="mt-6">
        {/*
          The search reads ?q= from the address bar, which only exists in the browser.
          The static HTML shows every tool, so the page is complete without JavaScript.
        */}
        <Suspense
          fallback={
            <div className="space-y-6">
              <SearchForm action={action} />
              <p className="text-sm text-fg-muted">All {tools.length} tools.</p>
              <ToolGrid tools={tools} headingLevel={2} />
            </div>
          }
        >
          <ToolSearch action={action} />
        </Suspense>
      </div>
    </Container>
  );
}
