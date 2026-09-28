import { ProsePage, ProseSection } from "@/components/ui/prose";
import { site } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "About",
  description:
    "Everything.Free Tools: free browser tools with no account, no upload for local tools and no artificial limits.",
  path: "/about/",
});

export default function AboutPage() {
  return (
    <ProsePage
      title="About"
      intro={`${site.tagline} Everything.Free Tools is a set of small, honest tools that run in your browser.`}
    >
      <ProseSection title="Principles">
        <ul>
          <li>
            <strong>Open, pick a tool, get it done.</strong> No sign-up, no email, no waiting.
          </li>
          <li>
            <strong>Local first.</strong> If a job can be done in the browser, it is. Every tool page says plainly where
            your data is processed.
          </li>
          <li>
            <strong>No artificial limits.</strong> No daily quotas, file-size paywalls or watermarks. When a tool has a
            real limit, from the browser or the method, the page says what it is.
          </li>
          <li>
            <strong>Correct over clever.</strong> A formatter must not change your data; a generator must use real
            randomness. Where a tool can&rsquo;t do something well, it says so rather than guessing.
          </li>
        </ul>
      </ProseSection>
      <ProseSection title="Who makes it">
        <p>
          Everything.Free Tools is part of <a href={site.parent.url}>{site.parent.name}</a>&rsquo;s Everything.Free
          project, alongside a <a href={site.libraryUrl}>curated library of free resources</a>. It is open source under
          the MIT licence and costs nothing to run beyond free static hosting.
        </p>
      </ProseSection>
      <ProseSection title="Feedback">
        <p>
          Found a bug or want a tool? <a href={site.issuesUrl}>Open an issue on GitHub</a>. Security problems:{" "}
          <a href={site.securityUrl}>report them privately</a>.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
