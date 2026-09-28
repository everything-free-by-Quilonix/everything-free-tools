import { ProsePage, ProseSection } from "@/components/ui/prose";
import { site } from "@/config/site";
import { buildMetadata } from "@/lib/seo";
import { tools } from "@/tools/registry";

export const metadata = buildMetadata({
  title: "Privacy",
  description:
    "What Everything.Free Tools does with your files and data: local tools process everything in your browser.",
  path: "/privacy/",
});

export default function PrivacyPage() {
  const local = tools.filter((tool) => tool.processing === "LOCAL").length;
  const network = tools.length - local;

  return (
    <ProsePage
      title="Privacy"
      intro="The short version: local tools process your files and text in your browser, and nothing you enter is sent anywhere."
    >
      <ProseSection title="Local tools">
        <p>
          {local === tools.length ? `All ${tools.length} tools` : `${local} of ${tools.length} tools`} are marked{" "}
          <strong>Processed locally</strong>. They do all their work with code running in your browser tab. The files
          you choose and the text you type are not uploaded, stored or logged, because there is no server that could
          receive them. This site is a set of static files.
        </p>
        <p>
          This is enforced, not just promised. Every page carries a Content Security Policy with{" "}
          <code>connect-src &apos;self&apos;</code>, which tells your browser to refuse any request from the page to
          another website. Even a bug could not send your data to a third party.
        </p>
      </ProseSection>

      <ProseSection title="Network tools">
        {network === 0 ? (
          <p>
            There are none at the moment. If one is added, its page will say what is sent and to whom before you use it.
          </p>
        ) : (
          <p>
            {network} tools need a network service. Each says so at the top of its page, with what is sent and to whom.
          </p>
        )}
      </ProseSection>

      <ProseSection title="What we don't do">
        <ul>
          <li>No accounts or sign-in.</li>
          <li>No analytics, tracking pixels, advertising or third-party scripts.</li>
          <li>No cookies. Nothing is stored in your browser after you leave the page.</li>
          <li>Fonts and all other assets are served from this site, not from third-party CDNs.</li>
        </ul>
      </ProseSection>

      <ProseSection title="Hosting">
        <p>
          The site is hosted on GitHub Pages. Like any web host, GitHub receives standard request information (such as
          your IP address) when your browser loads a page. That is covered by{" "}
          <a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
            GitHub&rsquo;s privacy statement
          </a>
          . Your files and text are never part of those requests.
        </p>
      </ProseSection>

      <ProseSection title="Checking for yourself">
        <p>
          Open your browser&rsquo;s developer tools, switch to the Network tab and use any local tool: you will see no
          request carrying your data. The <a href={site.repositoryUrl}>source code</a> is public.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
