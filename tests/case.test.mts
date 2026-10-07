import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { convertAllCases } from "@/engines/text/case";

describe("Text Case Converter Engine", () => {
  it("converts mixed string across standard programming cases", () => {
    const res = convertAllCases("hello_world_test");
    assert.equal(res.camel, "helloWorldTest");
    assert.equal(res.pascal, "HelloWorldTest");
    assert.equal(res.snake, "hello_world_test");
    assert.equal(res.kebab, "hello-world-test");
    assert.equal(res.constant, "HELLO_WORLD_TEST");
    assert.equal(res.title, "Hello World Test");
    assert.equal(res.lower, "hello_world_test");
    assert.equal(res.upper, "HELLO_WORLD_TEST");
  });

  it("handles camelCase and acronym inputs cleanly", () => {
    const res = convertAllCases("parseHTMLElement");
    assert.equal(res.kebab, "parse-html-element");
    assert.equal(res.snake, "parse_html_element");
  });
});
