"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton, DownloadLink } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea, TextInput } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { parseCsv } from "@/engines/data/csv";
import { textBlob } from "@/lib/downloads";

const SAMPLE_CSV = `id,name,role,department,salary
1,Alice Johnson,Lead Engineer,Platform,145000
2,Bob Smith,Senior Designer,Product,120000
3,Charlie Brown,Security Analyst,Infosec,130000
4,Diana Prince,Product Manager,Core,140000
5,Evan Wright,Data Scientist,Analytics,135000`;

export default function CsvViewerWorkspace() {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState<number | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const parsed = useMemo(() => {
    if (!csvText.trim()) return null;
    return parseCsv(csvText);
  }, [csvText]);

  const filteredRows = useMemo(() => {
    if (!parsed || parsed.rows.length === 0) return [];
    let rows = parsed.rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r) => r.some((cell) => cell.toLowerCase().includes(q)));
    }
    if (sortCol !== null) {
      rows = [...rows].sort((a, b) => {
        const valA = a[sortCol] ?? "";
        const valB = b[sortCol] ?? "";
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB)) {
          return sortAsc ? numA - numB : numB - numA;
        }
        return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
    }
    return rows;
  }, [parsed, search, sortCol, sortAsc]);

  const downloadBlob = useMemo(() => {
    if (!csvText.trim()) return null;
    return textBlob(csvText, "text/csv;charset=utf-8");
  }, [csvText]);

  const toggleSort = (colIdx: number) => {
    if (sortCol === colIdx) {
      if (sortAsc) {
        setSortAsc(false);
      } else {
        setSortCol(null);
        setSortAsc(true);
      }
    } else {
      setSortCol(colIdx);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-6">
      <Panel title="CSV Spreadsheet Source">
        <div className="space-y-4">
          <Field
            label="CSV Source Text"
            hint="Paste CSV or TSV data. Delimiters (comma, semicolon, tab) are auto-detected."
          >
            {(context) => (
              <TextArea
                context={context}
                rows={6}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV text here..."
                className="font-mono text-xs"
              />
            )}
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCsvText("")} disabled={!csvText}>
              Clear
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCsvText(SAMPLE_CSV)}>
              Reset Sample
            </Button>
          </div>
        </div>
      </Panel>

      <Panel
        title="Interactive Table View"
        actions={
          csvText.trim() ? (
            <>
              <CopyButton text={csvText} label="Copy CSV" />
              {downloadBlob && <DownloadLink blob={downloadBlob} fileName="table.csv" label="Download CSV" />}
            </>
          ) : null
        }
      >
        {parsed && parsed.headers.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="w-full max-w-xs">
                <Field label="Filter Rows" hideLabel>
                  {(context) => (
                    <TextInput
                      context={context}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search within table..."
                      className="text-xs"
                    />
                  )}
                </Field>
              </div>
              <span className="text-xs text-fg-muted">
                Showing {filteredRows.length} of {parsed.rows.length} rows ({parsed.headers.length} columns)
              </span>
            </div>

            <div className="overflow-x-auto rounded border border-border">
              <table className="w-full text-left text-xs text-fg">
                <thead className="bg-surface-raised border-b border-border font-semibold text-fg">
                  <tr>
                    {parsed.headers.map((h, i) => (
                      <th
                        key={i}
                        onClick={() => toggleSort(i)}
                        className="cursor-pointer select-none px-3 py-2.5 hover:bg-surface transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>{h}</span>
                          <span className="text-fg-subtle">{sortCol === i ? (sortAsc ? "▲" : "▼") : "↕"}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-surface-raised/40 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-3 py-2 whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="No table data">
            Paste CSV text above to explore, search, and sort the data in an interactive table.
          </EmptyState>
        )}
      </Panel>
    </div>
  );
}
