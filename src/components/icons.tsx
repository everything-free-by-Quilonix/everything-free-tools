import type { SVGProps } from "react";

/**
 * Icons, drawn for this project on a 24×24 grid with 1.75px strokes.
 *
 * Decorative by default (`aria-hidden`): every icon sits next to visible text or
 * inside a control with an accessible name. Pass `label` for the rare icon that
 * carries meaning on its own.
 */

const paths = {
  search: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM15.2 15.2 20 20",
  "arrow-right": "M4 12h15M13 6l6 6-6 6",
  "chevron-right": "M9 5l7 7-7 7",
  "chevron-down": "M5 9l7 7 7-7",
  check: "M4.5 12.5l5 5 10-11",
  copy: "M8 8h11v12H8zM5 16V4h11",
  download: "M12 3v12M7 10l5 5 5-5M4 20h16",
  upload: "M12 16V4M7 9l5-5 5 5M4 20h16",
  alert: "M12 3 2.5 20h19L12 3ZM12 10v4.5M12 17.2v.3",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.3",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18",
  x: "M6 6l12 12M18 6 6 18",
  refresh: "M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 2.5-2.5L20 17M15.5 9.5v.2",
  text: "M5 6h14M5 11h14M5 16h9",
  code: "M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5M13.5 4.5l-3 15",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2.5v2.5H14zM17.5 17.5H20V20h-2.5zM6.5 6.5h1M16.5 6.5h1M6.5 16.5h1",
  database:
    "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3ZM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3",
  shield: "M12 3 4.5 6v5.5c0 4.5 3.2 8.2 7.5 9.5 4.3-1.3 7.5-5 7.5-9.5V6L12 3Z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3.5v4M16 3.5v4",
  book: "M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5V5.5ZM12 6v13.5",
  file: "M6 3h8l4 4v14H6zM14 3v4h4",
  external: "M14 4h6v6M20 4l-9 9M18 14v6H4V6h6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
} as const;

export type IconName = keyof typeof paths;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  size?: number;
  label?: string;
}

export function Icon({ name, size = 20, label, ...rest }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
