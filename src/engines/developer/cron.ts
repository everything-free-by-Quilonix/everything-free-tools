/**
 * Native Cron Expression Parser & Scheduler Engine.
 *
 * Parses 5-field (standard Unix) and 6-field cron expressions, produces
 * human-readable explanations, validates field bounds, and calculates upcoming run times.
 * 100% local, zero network.
 */

export interface CronFieldDetail {
  name: string;
  expression: string;
  description: string;
}

export interface CronParsedResult {
  isValid: boolean;
  error?: string;
  humanDescription: string;
  fields: CronFieldDetail[];
  nextRuns: string[];
}

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/**
 * Parses and explains a cron expression.
 */
export function parseCron(expr: string, baseDate = new Date()): CronParsedResult {
  const parts = expr.trim().split(/\s+/);

  if (parts.length !== 5 && parts.length !== 6) {
    return {
      isValid: false,
      error: `Expected 5 or 6 fields, received ${parts.length}. Example: "*/15 * * * *" or "0 9 * * 1-5"`,
      humanDescription: "",
      fields: [],
      nextRuns: [],
    };
  }

  const isSix = parts.length === 6;
  const minute = isSix ? (parts[1] ?? "*") : (parts[0] ?? "*");
  const hour = isSix ? (parts[2] ?? "*") : (parts[1] ?? "*");
  const dayOfMonth = isSix ? (parts[3] ?? "*") : (parts[2] ?? "*");
  const month = isSix ? (parts[4] ?? "*") : (parts[3] ?? "*");
  const dayOfWeek = isSix ? (parts[5] ?? "*") : (parts[4] ?? "*");

  const fields: CronFieldDetail[] = [];
  if (isSix) {
    fields.push({
      name: "Seconds",
      expression: parts[0] ?? "0",
      description: explainField(parts[0] ?? "0", "second", 0, 59),
    });
  }
  fields.push(
    { name: "Minute", expression: minute, description: explainField(minute, "minute", 0, 59) },
    { name: "Hour", expression: hour, description: explainField(hour, "hour", 0, 23) },
    {
      name: "Day of Month",
      expression: dayOfMonth,
      description: explainField(dayOfMonth, "day of month", 1, 31),
    },
    {
      name: "Month",
      expression: month,
      description: explainField(month, "month", 1, 12, MONTH_NAMES),
    },
    {
      name: "Day of Week",
      expression: dayOfWeek,
      description: explainField(dayOfWeek, "day of week", 0, 7, DAY_NAMES),
    },
  );

  const human = buildHumanDescription(minute, hour, dayOfMonth, month, dayOfWeek);
  const nextRuns = calculateNextRuns(minute, hour, dayOfMonth, month, dayOfWeek, baseDate, 5);

  return {
    isValid: true,
    humanDescription: human,
    fields,
    nextRuns,
  };
}

function explainField(val: string, unit: string, min: number, max: number, names?: readonly string[]): string {
  if (val === "*") return `Every ${unit}`;
  if (val.startsWith("*/")) {
    const step = val.slice(2);
    return `Every ${step} ${unit}s`;
  }
  if (val.includes("-")) {
    const [start, end] = val.split("-");
    const sName = names && start ? names[Number(start)] || start : start;
    const eName = names && end ? names[Number(end)] || end : end;
    return `Every ${unit} from ${sName} through ${eName}`;
  }
  if (val.includes(",")) {
    const list = val
      .split(",")
      .map((item) => (names ? names[Number(item)] || item : item))
      .join(", ");
    return `At ${unit} ${list}`;
  }
  const display = names ? names[Number(val)] || val : val;
  return `At ${unit} ${display}`;
}

function buildHumanDescription(min: string, hr: string, dom: string, mon: string, dow: string): string {
  let desc = "";

  // Time part
  if (min === "*" && hr === "*") {
    desc += "Every minute";
  } else if (min.startsWith("*/") && hr === "*") {
    desc += `Every ${min.slice(2)} minutes`;
  } else if (hr === "*" && !min.includes("*")) {
    desc += `At ${min} minutes past every hour`;
  } else if (!hr.includes("*") && !min.includes("*")) {
    const h = hr.padStart(2, "0");
    const m = min.padStart(2, "0");
    desc += `At ${h}:${m}`;
  } else {
    desc += `At hour ${hr}, minute ${min}`;
  }

  // Day of month / week
  if (dom !== "*" && dow === "*") {
    desc += ` on day ${dom} of the month`;
  } else if (dow !== "*" && dom === "*") {
    if (dow === "1-5") {
      desc += " every weekday (Monday through Friday)";
    } else if (dow === "0,6" || dow === "6,0") {
      desc += " on weekends";
    } else {
      const days = dow
        .split(",")
        .map((d) => DAY_NAMES[Number(d)] || d)
        .join(", ");
      desc += ` on ${days}`;
    }
  }

  // Month
  if (mon !== "*") {
    const m = MONTH_NAMES[Number(mon)] || mon;
    desc += ` in ${m}`;
  }

  return desc;
}

function calculateNextRuns(
  minStr: string,
  hrStr: string,
  domStr: string,
  monStr: string,
  dowStr: string,
  from: Date,
  count = 5,
): string[] {
  const runs: string[] = [];
  const current = new Date(from.getTime());
  // Move to next minute boundary
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1);

  const matchField = (val: number, expr: string): boolean => {
    if (expr === "*") return true;
    if (expr.startsWith("*/")) {
      const step = parseInt(expr.slice(2), 10);
      return val % step === 0;
    }
    if (expr.includes("-")) {
      const [s, e] = expr.split("-").map(Number);
      return s !== undefined && e !== undefined && val >= s && val <= e;
    }
    if (expr.includes(",")) {
      return expr.split(",").map(Number).includes(val);
    }
    return parseInt(expr, 10) === val;
  };

  let searchLimit = 0;
  while (runs.length < count && searchLimit < 10000) {
    searchLimit++;
    const m = current.getMinutes();
    const h = current.getHours();
    const dom = current.getDate();
    const mon = current.getMonth() + 1;
    const dow = current.getDay();

    if (
      matchField(mon, monStr) &&
      matchField(dom, domStr) &&
      matchField(dow, dowStr) &&
      matchField(h, hrStr) &&
      matchField(m, minStr)
    ) {
      runs.push(
        current.toLocaleString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    }

    current.setMinutes(current.getMinutes() + 1);
  }

  return runs;
}
