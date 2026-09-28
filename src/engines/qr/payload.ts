/**
 * What goes inside a QR code.
 *
 * Wi-Fi uses the de facto `WIFI:` format that iOS and Android cameras recognise
 * (originally from the ZXing project): `WIFI:T:WPA;S:<ssid>;P:<password>;H:true;;`.
 * Backslash, semicolon, comma, colon and double quote in the SSID or password must be
 * escaped with a backslash, or the phone reads a different network name.
 */

import { ToolError } from "@/lib/errors";

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiDetails {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export function escapeWifiValue(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function wifiPayload({ ssid, password, security, hidden }: WifiDetails): string {
  if (ssid.length === 0) throw new ToolError("Enter the network name (SSID).");
  if (security !== "nopass" && password.length === 0) {
    throw new ToolError("Enter the network password, or choose “No password” for an open network.");
  }
  const wpaLengthOk = (password.length >= 8 && password.length <= 63) || /^[0-9a-f]{64}$/i.test(password);
  if (security === "WPA" && !wpaLengthOk) {
    throw new ToolError("WPA passwords are 8 to 63 characters long (or a 64-digit hex key). Check the password.");
  }
  const parts = [`T:${security}`, `S:${escapeWifiValue(ssid)}`];
  if (security !== "nopass") parts.push(`P:${escapeWifiValue(password)}`);
  if (hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

export function textPayload(text: string): string {
  if (text.length === 0) throw new ToolError("Enter a link or some text.");
  return text;
}

/** A link typed without a scheme ("example.com") scans as plain text on many phones. */
export function looksLikeBareDomain(text: string): boolean {
  return /^(?!https?:\/\/)(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i.test(text.trim());
}
