"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextInput, Select } from "@/components/ui/field";
import { convertUnit, UNIT_CATEGORIES, type UnitCategory } from "@/engines/math/units";

const CATEGORY_KEYS: UnitCategory[] = [
  "length",
  "mass",
  "temperature",
  "area",
  "volume",
  "time",
  "storage",
  "speed",
  "pressure",
];

export default function UnitConverterWorkspace() {
  const [category, setCategory] = useState<UnitCategory>("length");
  const [value, setValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("m");
  const [toUnit, setToUnit] = useState("ft");

  const catData = UNIT_CATEGORIES[category];

  const handleCategoryChange = (nextCat: UnitCategory) => {
    setCategory(nextCat);
    const data = UNIT_CATEGORIES[nextCat];
    if (data?.units && data.units.length >= 2) {
      const u0 = data.units[0];
      const u1 = data.units[1];
      if (u0 && u1) {
        setFromUnit(u0.id);
        setToUnit(u1.id);
      }
    }
  };

  const swapUnits = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  const convertedValue = useMemo(() => {
    const num = parseFloat(value);
    if (isNaN(num)) return "";
    const result = convertUnit(num, fromUnit, toUnit, category);
    if (result === null) return "";
    // Format precision
    if (Math.abs(result) < 1e-6 || Math.abs(result) >= 1e9) {
      return result.toExponential(6);
    }
    return String(Math.round(result * 1e8) / 1e8);
  }, [value, fromUnit, toUnit, category]);

  // All conversions in the category
  const allConversions = useMemo(() => {
    const num = parseFloat(value);
    if (isNaN(num)) return [];
    return catData.units.map((u) => {
      const res = convertUnit(num, fromUnit, u.id, category);
      let formatted = "";
      if (res !== null) {
        formatted =
          Math.abs(res) < 1e-6 || Math.abs(res) >= 1e9 ? res.toExponential(6) : String(Math.round(res * 1e8) / 1e8);
      }
      return { unit: u, value: formatted };
    });
  }, [value, fromUnit, category, catData]);

  return (
    <div className="space-y-6">
      <Panel title="Select Measurement Category">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_KEYS.map((catKey) => {
            const active = category === catKey;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => handleCategoryChange(catKey)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-accent text-accent-fg"
                    : "bg-surface-raised text-fg-muted hover:text-fg hover:bg-border/40"
                }`}
              >
                {UNIT_CATEGORIES[catKey].name}
              </button>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Convert">
          <div className="space-y-4">
            <Field label="Input Value">
              {(context) => (
                <TextInput
                  context={context}
                  type="number"
                  value={value}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
                  placeholder="Enter number..."
                />
              )}
            </Field>

            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-end">
              <Field label="From Unit">
                {(context) => (
                  <Select
                    context={context}
                    value={fromUnit}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFromUnit(e.target.value)}
                  >
                    {catData.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Button variant="secondary" size="sm" onClick={swapUnits} className="mb-1" title="Swap Units">
                ⇄
              </Button>

              <Field label="To Unit">
                {(context) => (
                  <Select
                    context={context}
                    value={toUnit}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setToUnit(e.target.value)}
                  >
                    {catData.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.symbol})
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>
        </Panel>

        <Panel title="Result">
          {convertedValue ? (
            <div className="space-y-4">
              <div className="rounded border border-border bg-surface-raised p-4 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Converted Output</span>
                <div className="font-mono text-2xl font-bold text-fg break-all flex items-center justify-between">
                  <span>{convertedValue}</span>
                  <span className="text-sm font-normal text-fg-muted ml-2">
                    {catData.units.find((u) => u.id === toUnit)?.symbol}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <CopyButton text={convertedValue} label="Copy Value" />
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center text-sm text-fg-muted">
              Enter a valid number to convert.
            </div>
          )}
        </Panel>
      </div>

      {allConversions.length > 0 && (
        <Panel title={`All ${catData.name} Units Comparison`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allConversions.map(({ unit, value: unitVal }) => (
              <div
                key={unit.id}
                className="rounded border border-border p-2.5 flex justify-between items-center text-xs bg-surface-raised"
              >
                <div className="truncate mr-2">
                  <span className="font-semibold text-fg">{unit.name}: </span>
                  <span className="font-mono text-fg-muted">{unitVal}</span>
                </div>
                <span className="text-fg-subtle text-[11px] font-mono">{unit.symbol}</span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
