import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateJsonSchema } from "@/engines/data/json-schema";

describe("JSON Schema Generator Engine", () => {
  it("infers schema for primitive types", () => {
    assert.equal(generateJsonSchema("hello").type, "string");
    assert.equal(generateJsonSchema(42).type, "integer");
    assert.equal(generateJsonSchema(3.14).type, "number");
    assert.equal(generateJsonSchema(true).type, "boolean");
    assert.equal(generateJsonSchema(null).type, "null");
  });

  it("infers object schema with required properties", () => {
    const data = {
      id: 101,
      name: "Alice",
      isActive: true,
    };

    const schema = generateJsonSchema(data);
    assert.equal(schema.type, "object");
    assert.ok(schema.properties);
    assert.equal(schema.properties.id?.type, "integer");
    assert.equal(schema.properties.name?.type, "string");
    assert.equal(schema.properties.isActive?.type, "boolean");
    assert.deepEqual(schema.required?.sort(), ["id", "isActive", "name"]);
  });

  it("infers array schema with primitive items", () => {
    const schema = generateJsonSchema(["apple", "banana", "cherry"]);
    assert.equal(schema.type, "array");
    assert.deepEqual(schema.items, { type: "string" });
  });

  it("infers array schema with merged object items", () => {
    const data = [
      { id: 1, name: "Alpha" },
      { id: 2, name: "Beta", tag: "promo" },
    ];

    const schema = generateJsonSchema(data);
    assert.equal(schema.type, "array");
    const itemSchema = schema.items as Record<string, unknown>;
    assert.equal(itemSchema.type, "object");
    const props = itemSchema.properties as Record<string, unknown>;
    assert.ok(props.id);
    assert.ok(props.name);
    assert.ok(props.tag);
    // id and name are in all items, tag is not
    assert.deepEqual((itemSchema.required as string[]).sort(), ["id", "name"]);
  });
});
