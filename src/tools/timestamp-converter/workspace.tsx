"use client";

import { useEffect, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { controlClasses, Segmented } from "@/components/ui/field";
import { fromIsoOrDate, fromUnix, type TimestampInfo } from "@/engines/data/timestamp";

export default function TimestampConverterWorkspace() {
  const [nowSec, setNowSec] = useState(() => Math.floor(Date.now() / 1000));
  const [paused, setPaused] = useState(false);

  const [tsInput, setTsInput] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [unitMode, setUnitMode] = useState<"seconds" | "milliseconds">("seconds");

  const [dateInput, setDateInput] = useState(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const [info, setInfo] = useState<TimestampInfo | null>(() => fromUnix(Math.floor(Date.now() / 1000), true));

  // Ticker for current time
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setNowSec(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [paused]);

  const handleTimestampChange = (val: string) => {
    setTsInput(val);
    const num = Number(val);
    if (!isNaN(num) && val.trim() !== "") {
      setInfo(fromUnix(num, unitMode === "seconds"));
    } else {
      setInfo(null);
    }
  };

  const handleUnitModeChange = (val: string) => {
    const next = val as "seconds" | "milliseconds";
    setUnitMode(next);
    const num = Number(tsInput);
    if (!isNaN(num) && tsInput.trim() !== "") {
      setInfo(fromUnix(num, next === "seconds"));
    }
  };

  const handleDateChange = (val: string) => {
    setDateInput(val);
    const parsed = fromIsoOrDate(val);
    if (parsed) {
      setInfo(parsed);
      setTsInput(unitMode === "seconds" ? String(parsed.seconds) : String(parsed.milliseconds));
    }
  };

  const setNow = () => {
    const now = Date.now();
    const sec = Math.floor(now / 1000);
    setTsInput(unitMode === "seconds" ? String(sec) : String(now));
    setInfo(fromUnix(unitMode === "seconds" ? sec : now, unitMode === "seconds"));
  };

  return (
    <div className="space-y-6">
      {/* Current Unix Timestamp Banner */}
      <div className="rounded-[var(--radius)] border border-border-strong bg-surface-raised p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-fg-muted block">
            Current Unix Epoch Time
          </span>
          <span className="font-mono text-2xl font-bold text-fg">{nowSec}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={String(nowSec)} label="Copy Epoch" />
          <Button variant="secondary" size="sm" onClick={() => setPaused(!paused)}>
            {paused ? "Resume Ticker" : "Pause"}
          </Button>
          <Button variant="primary" size="sm" onClick={setNow}>
            Convert Current Time
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Convert Timestamp to Date">
          <div className="space-y-4">
            <Segmented
              legend="Unit Format"
              value={unitMode}
              onChange={handleUnitModeChange}
              options={[
                { value: "seconds", label: "Seconds (10 digits)" },
                { value: "milliseconds", label: "Milliseconds (13 digits)" },
              ]}
            />

            <div>
              <label className="text-sm font-medium text-fg block mb-1.5">Timestamp Value</label>
              <input
                className={controlClasses}
                value={tsInput}
                onChange={(e) => handleTimestampChange(e.target.value)}
                placeholder="e.g. 1700000000"
              />
            </div>

            <div className="pt-2 border-t border-border-strong space-y-2">
              <label className="text-sm font-medium text-fg block mb-1.5">Or Pick Date and Time</label>
              <input
                type="datetime-local"
                value={dateInput}
                onChange={(e) => handleDateChange(e.target.value)}
                className={controlClasses}
              />
            </div>
          </div>
        </Panel>

        <Panel title="Converted Date & Time">
          {info ? (
            <div className="space-y-3">
              <div className="rounded border border-border-strong p-3 space-y-2 bg-surface-raised text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-fg-muted">Relative:</span>
                  <span className="font-medium text-accent">{info.relative}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-fg-muted">Seconds:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg">{info.seconds}</span>
                    <CopyButton text={String(info.seconds)} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-fg-muted">Milliseconds:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg">{info.milliseconds}</span>
                    <CopyButton text={String(info.milliseconds)} />
                  </div>
                </div>
                <div className="pt-2 border-t border-border-strong flex justify-between items-center">
                  <span className="font-semibold text-fg-muted">ISO 8601:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg truncate max-w-[200px] sm:max-w-none">{info.iso}</span>
                    <CopyButton text={info.iso} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-fg-muted">UTC String:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg truncate max-w-[200px] sm:max-w-none">{info.utc}</span>
                    <CopyButton text={info.utc} />
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-fg-muted">Local Time:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-fg truncate max-w-[200px] sm:max-w-none">{info.local}</span>
                    <CopyButton text={info.local} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-fg-muted">
              Enter a valid timestamp value to see converted dates.
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
