/**
 * Native JSON Schema Generator Engine.
 *
 * Infers Draft-07 JSON Schema from any JSON object or array,
 * identifying primitive types, object properties, required keys,
 * and array item structures. 100% local, zero network.
 */

export interface SchemaOptions {
  includeSchemaUri?: boolean;
  inferRequired?: boolean;
  schemaTitle?: string;
}

export interface JsonSchemaObject {
  $schema?: string;
  title?: string;
  type?: string | string[];
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  items?: JsonSchemaObject | JsonSchemaObject[];
  [key: string]: unknown;
}

/**
 * Generates a JSON Schema from a sample JSON data value.
 */
export function generateJsonSchema(data: unknown, options: SchemaOptions = {}): JsonSchemaObject {
  const rootSchema = inferSchema(data, options.inferRequired ?? true);

  if (options.includeSchemaUri ?? true) {
    rootSchema.$schema = "http://json-schema.org/draft-07/schema#";
  }

  if (options.schemaTitle) {
    rootSchema.title = options.schemaTitle;
  }

  return rootSchema;
}

function inferSchema(value: unknown, inferRequired: boolean): JsonSchemaObject {
  if (value === null) {
    return { type: "null" };
  }

  if (typeof value === "boolean") {
    return { type: "boolean" };
  }

  if (typeof value === "number") {
    return { type: Number.isInteger(value) ? "integer" : "number" };
  }

  if (typeof value === "string") {
    return { type: "string" };
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return { type: "array", items: {} };
    }

    // Infer schema of elements
    const itemSchemas = value.map((item) => inferSchema(item, inferRequired));
    // If uniform types, condense
    const firstType = itemSchemas[0]?.type;
    const allSameType = itemSchemas.every((s) => s.type === firstType && typeof s.type === "string");

    if (allSameType && firstType !== "object") {
      return {
        type: "array",
        items: { type: firstType },
      };
    }

    // If objects, merge property schemas
    if (itemSchemas.every((s) => s.type === "object")) {
      const mergedProps: Record<string, JsonSchemaObject> = {};
      const requiredKeysCount: Record<string, number> = {};

      for (const item of value) {
        if (typeof item === "object" && item !== null && !Array.isArray(item)) {
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
            requiredKeysCount[k] = (requiredKeysCount[k] ?? 0) + 1;
            if (!mergedProps[k]) {
              mergedProps[k] = inferSchema(v, inferRequired);
            }
          }
        }
      }

      const required: string[] = [];
      if (inferRequired) {
        for (const [k, count] of Object.entries(requiredKeysCount)) {
          if (count === value.length) {
            required.push(k);
          }
        }
      }

      const itemsSchema: JsonSchemaObject = {
        type: "object",
        properties: mergedProps,
      };
      if (required.length > 0) {
        itemsSchema.required = required;
      }

      return {
        type: "array",
        items: itemsSchema,
      };
    }

    return {
      type: "array",
      items: itemSchemas[0] ?? {},
    };
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const properties: Record<string, JsonSchemaObject> = {};
    const required: string[] = [];

    for (const [key, val] of Object.entries(obj)) {
      properties[key] = inferSchema(val, inferRequired);
      if (inferRequired && val !== undefined) {
        required.push(key);
      }
    }

    const schema: JsonSchemaObject = {
      type: "object",
      properties,
    };

    if (required.length > 0) {
      schema.required = required;
    }

    return schema;
  }

  return {};
}
