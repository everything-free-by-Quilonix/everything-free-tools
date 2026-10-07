"use client";

import { useMemo, useState } from "react";

import { Panel } from "@/components/tool/panel";
import { CopyButton } from "@/components/ui/actions";
import { Button } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";
import { OutputText } from "@/components/ui/output-text";
import { EmptyState, Notice } from "@/components/ui/states";
import { decodeJwt } from "@/engines/developer/jwt";

const SAMPLE_JWT =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIEpvaG5zb24iLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTk5OTk5OTk5OSwiaXNzIjoiZXZlcnl0aGluZy5mcmVlIn0.signaturePlaceholder";

export default function JwtDebuggerWorkspace() {
  const [token, setToken] = useState(SAMPLE_JWT);

  const decoded = useMemo(() => {
    if (!token.trim()) return null;
    return decodeJwt(token);
  }, [token]);

  const headerStr = useMemo(() => {
    if (!decoded || !decoded.header) return "";
    return JSON.stringify(decoded.header, null, 2);
  }, [decoded]);

  const payloadStr = useMemo(() => {
    if (!decoded || !decoded.payload) return "";
    return JSON.stringify(decoded.payload, null, 2);
  }, [decoded]);

  return (
    <div className="space-y-6">
      <Notice tone="info" title="Offline Token Inspection">
        Tokens are decoded strictly within your browser. Signatures are inspected visually, and no secret keys or token
        payloads ever leave your device.
      </Notice>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Encoded JWT Token">
          <div className="space-y-4">
            <Field label="Bearer JWT Token" hint="Paste any standard header.payload.signature JWT.">
              {(context) => (
                <TextArea
                  context={context}
                  rows={10}
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Paste encoded JWT string here..."
                  className="font-mono text-xs break-all"
                />
              )}
            </Field>

            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setToken("")} disabled={!token}>
                Clear
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setToken(SAMPLE_JWT)}>
                Reset Sample
              </Button>
            </div>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel
            title="Decoded Header"
            actions={headerStr ? <CopyButton text={headerStr} label="Copy Header" /> : null}
          >
            {decoded && decoded.validFormat ? (
              <OutputText value={headerStr} rows={5} wrap="off" />
            ) : (
              <EmptyState title="No valid header">Header metadata (algorithm, token type) will appear here.</EmptyState>
            )}
          </Panel>

          <Panel
            title="Decoded Payload (Claims)"
            actions={payloadStr ? <CopyButton text={payloadStr} label="Copy Payload" /> : null}
          >
            {decoded ? (
              decoded.validFormat ? (
                <div className="space-y-3">
                  {decoded.claims.expiresAt && (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border font-medium ${
                          decoded.claims.expiresAt.isExpired
                            ? "bg-danger-soft text-danger-fg border-danger/40"
                            : "bg-success-soft text-success-fg border-success/30"
                        }`}
                      >
                        {decoded.claims.expiresAt.isExpired ? "Token Expired" : "Token Active"}
                      </span>
                      <span className="text-xs text-fg-muted">Expires: {decoded.claims.expiresAt.formatted}</span>
                    </div>
                  )}
                  <OutputText value={payloadStr} rows={8} wrap="off" />
                </div>
              ) : (
                <Notice tone="danger" title="Invalid JWT Format">
                  {decoded.error}
                </Notice>
              )
            ) : (
              <EmptyState title="No payload decoded">
                Payload claims (subject, issuer, expiry, user data) will appear here.
              </EmptyState>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
