import { notFound } from "next/navigation";

import { JsonLd } from "@/components/json-ld";
import { ToolPage } from "@/components/tool/tool-page";
import { buildMetadata, toolSchema } from "@/lib/seo";
import { getTool, tools } from "@/tools/registry";

export const dynamicParams = false;

export function generateStaticParams() {
  return tools.map((tool) => ({ tool: tool.slug }));
}

type Props = { params: Promise<{ tool: string }> };

export async function generateMetadata({ params }: Props) {
  const tool = getTool((await params).tool);
  if (!tool) return {};
  return buildMetadata({ title: tool.name, description: tool.shortDescription, path: `/tools/${tool.slug}/` });
}

export default async function Page({ params }: Props) {
  const tool = getTool((await params).tool);
  if (!tool) notFound();
  return (
    <>
      <ToolPage tool={tool} />
      <JsonLd data={toolSchema(tool)} />
    </>
  );
}
