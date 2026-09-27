import { z } from "zod";
import { CURRENT_CONFIG_VERSION } from "../constants/app.constants.js";

export const KeyAuthConfigSchema = z
  .object({
    type: z.literal("key"),
    keyPath: z
      .string({ required_error: "keyPath is required for key authentication" })
      .min(1, "keyPath cannot be empty"),
  })
  .strict();

export const PasswordAuthConfigSchema = z
  .object({
    type: z.literal("password"),
    secretRef: z
      .string({ required_error: "secretRef is required for password authentication" })
      .min(1, "secretRef cannot be empty"),
  })
  .strict();

export const AgentAuthConfigSchema = z
  .object({
    type: z.literal("agent"),
  })
  .strict();

export const AuthConfigSchema = z.discriminatedUnion("type", [
  KeyAuthConfigSchema,
  PasswordAuthConfigSchema,
  AgentAuthConfigSchema,
]);

export const ServerSchema = z
  .object({
    tag: z
      .string({ required_error: "tag is required" })
      .min(1, "tag cannot be empty")
      .regex(
        /^[a-zA-Z0-9_-]+$/,
        "tag must only contain letters, numbers, hyphens, and underscores"
      ),
    name: z.string({ required_error: "name is required" }).min(1, "name cannot be empty"),
    host: z.string({ required_error: "host is required" }).min(1, "host cannot be empty"),
    port: z
      .number({ required_error: "port is required" })
      .int("port must be an integer")
      .min(1, "port must be between 1 and 65535")
      .max(65535, "port must be between 1 and 65535")
      .default(22),
    username: z
      .string({ required_error: "username is required" })
      .min(1, "username cannot be empty"),
    group: z.string().optional(),
    description: z.string().optional(),
    auth: AuthConfigSchema,
  })
  .strict();

export const ConfigSchema = z
  .object({
    version: z
      .literal(CURRENT_CONFIG_VERSION, {
        invalid_type_error: `Config version must be ${CURRENT_CONFIG_VERSION}`,
      })
      .default(CURRENT_CONFIG_VERSION),
    servers: z.array(ServerSchema).default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    const seenTags = new Map<string, number>();

    data.servers.forEach((server, index) => {
      const lowerTag = server.tag.toLowerCase();
      if (seenTags.has(lowerTag)) {
        const firstIndex = seenTags.get(lowerTag)!;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate tag "${server.tag}" found (first defined at server index ${firstIndex})`,
          path: ["servers", index, "tag"],
        });
      } else {
        seenTags.set(lowerTag, index);
      }
    });
  });

/**
 * Formats Zod validation issues into clean, readable strings.
 */
export function formatConfigValidationErrors(error: z.ZodError): string[] {
  const serverIssues = new Map<string, string[]>();
  const generalIssues: string[] = [];

  for (const issue of error.issues) {
    const path = issue.path;
    // Check if error belongs to a specific server: servers[index]
    if (path[0] === "servers" && typeof path[1] === "number") {
      const serverIdx = path[1];
      const field = path.slice(2).join(".") || "definition";
      const key = `Server at index ${serverIdx}`;
      if (!serverIssues.has(key)) {
        serverIssues.set(key, []);
      }
      serverIssues.get(key)!.push(`- ${field}: ${issue.message}`);
    } else {
      const fieldPath = path.length > 0 ? path.join(".") + ": " : "";
      generalIssues.push(`- ${fieldPath}${issue.message}`);
    }
  }

  const output: string[] = [];
  if (generalIssues.length > 0) {
    output.push(...generalIssues);
  }

  for (const [serverHeader, issues] of serverIssues.entries()) {
    output.push(`${serverHeader}:`, ...issues);
  }

  return output;
}
