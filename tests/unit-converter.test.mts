import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { convertUnit } from "@/engines/math/units";

describe("Universal Unit Converter Engine", () => {
  it("converts length units accurately", () => {
    // 1 meter = 100 cm
    const cm = convertUnit(1, "m", "cm", "length");
    assert.equal(cm, 100);

    // 1 inch = 25.4 mm
    const mm = convertUnit(1, "in", "mm", "length");
    assert.equal(Math.round(mm! * 10) / 10, 25.4);

    // 1 km = 1000 m
    const km = convertUnit(1000, "m", "km", "length");
    assert.equal(km, 1);
  });

  it("converts mass units accurately", () => {
    // 1 kg = 1000 g
    const g = convertUnit(1, "kg", "g", "mass");
    assert.equal(g, 1000);

    // 1 lb to kg
    const kg = convertUnit(1, "lb", "kg", "mass");
    assert.equal(Math.round(kg! * 10000) / 10000, 0.4536);
  });

  it("converts temperature with affine transformations", () => {
    // 0 C = 32 F
    const f = convertUnit(0, "c", "f", "temperature");
    assert.equal(f, 32);

    // 100 C = 212 F
    const boilF = convertUnit(100, "c", "f", "temperature");
    assert.equal(boilF, 212);

    // 0 C = 273.15 K
    const k = convertUnit(0, "c", "k", "temperature");
    assert.equal(k, 273.15);
  });

  it("converts digital storage units accurately", () => {
    // 1 KB = 1000 B
    assert.equal(convertUnit(1, "kb", "byte", "storage"), 1000);

    // 1 KiB = 1024 B
    assert.equal(convertUnit(1, "kib", "byte", "storage"), 1024);

    // 1 MB = 1000 KB
    assert.equal(convertUnit(1, "mb", "kb", "storage"), 1000);

    // 1 MiB = 1024 KiB
    assert.equal(convertUnit(1, "mib", "kib", "storage"), 1024);
  });

  it("converts time units accurately", () => {
    assert.equal(convertUnit(1, "hr", "min", "time"), 60);
    assert.equal(convertUnit(1, "day", "hr", "time"), 24);
  });

  it("returns original value when fromUnit equals toUnit", () => {
    assert.equal(convertUnit(42, "m", "m", "length"), 42);
  });
});
