import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatSql, minifySql } from "@/engines/developer/sql";

describe("SQL Formatter Engine", () => {
  it("formats and indents standard SELECT query", () => {
    const raw = "select id, name, email from users where active = 1 and age > 18 order by name desc";
    const formatted = formatSql(raw, { keywordCase: "upper", indentSize: 2 });
    assert.ok(formatted.includes("SELECT"));
    assert.ok(formatted.includes("FROM users"));
    assert.ok(formatted.includes("WHERE active = 1"));
    assert.ok(formatted.includes("ORDER BY name DESC"));
  });

  it("formats JOIN statements cleanly", () => {
    const raw = "select u.name, o.total from users u left join orders o on u.id = o.user_id";
    const formatted = formatSql(raw, { keywordCase: "upper" });
    assert.ok(formatted.includes("LEFT JOIN orders o"));
    assert.ok(formatted.includes("ON u.id = o.user_id"));
  });

  it("minifies SQL query into a single line", () => {
    const raw = `
      SELECT id, name
      FROM users
      WHERE role = 'admin'
    `;
    const minified = minifySql(raw);
    assert.equal(minified, "SELECT id, name FROM users WHERE role = 'admin'");
  });
});
