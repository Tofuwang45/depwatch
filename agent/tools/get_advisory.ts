import { defineTool } from "eve/tools";
import { z } from "zod";

import { getAdvisory } from "#lib/sources.ts";

export default defineTool({
  description:
    "Fetch the full OSV record for one advisory id from a scan, to answer follow-up questions about impact or remediation.",
  inputSchema: z.object({
    id: z
      .string()
      .regex(/^[A-Z]+-[\w-]+$/, "Expected an advisory id such as GHSA-xxxx-xxxx-xxxx.")
      .describe("Advisory id from a scan finding, such as GHSA-29mw-wpgm-hmr9."),
    package: z.string().optional().describe("Affected package name, to resolve the fixed version."),
    version: z.string().optional().describe("Installed version of that package."),
  }),
  async execute({ id, package: name, version }) {
    return getAdvisory(id, name && version ? { name, version } : undefined);
  },
});
