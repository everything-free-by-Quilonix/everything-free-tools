import { ProsePage, ProseSection } from "@/components/ui/prose";
import { site } from "@/config/site";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Accessibility",
  description:
    "How Everything.Free Tools approaches accessibility, what has been checked, and how to report a problem.",
  path: "/accessibility/",
});

export default function AccessibilityPage() {
  return (
    <ProsePage
      title="Accessibility"
      intro="Every tool should work with a keyboard, a screen reader, zoom and a small screen. We aim for WCAG 2.1 level AA."
    >
      <ProseSection title="What we do">
        <ul>
          <li>All controls are native HTML elements with visible labels, reachable and usable with a keyboard.</li>
          <li>A visible focus outline on every interactive element, and a skip link to the main content.</li>
          <li>Text and controls meet AA colour-contrast ratios in the dark theme.</li>
          <li>File inputs always have a button; drag and drop is optional.</li>
          <li>Results, errors and progress are announced to screen readers.</li>
          <li>Zoom is never disabled, and pages reflow down to a 320-pixel-wide screen.</li>
          <li>Animations are reduced when your system asks for reduced motion.</li>
        </ul>
      </ProseSection>
      <ProseSection title="How it's checked">
        <p>
          Every page is tested automatically with axe-core for serious and critical issues, and for keyboard access and
          horizontal overflow on a phone-sized screen. Automated checks find only part of the problems, so this is not a
          claim of full conformance: that needs manual testing with assistive technologies, which we have not yet
          completed.
        </p>
      </ProseSection>
      <ProseSection title="Known limitations">
        <ul>
          <li>The QR code preview is an image; its content is the text you entered, which stays visible next to it.</li>
          <li>Image previews in the compressor are decorative; the file names and sizes are given as text.</li>
        </ul>
      </ProseSection>
      <ProseSection title="Report a problem">
        <p>
          If something doesn&rsquo;t work for you, <a href={site.issuesUrl}>open an issue</a> and describe what you were
          trying to do and what you use (browser, screen reader, zoom level). We treat accessibility bugs as bugs.
        </p>
      </ProseSection>
    </ProsePage>
  );
}
