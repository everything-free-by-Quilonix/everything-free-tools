/**
 * Universal Unit Converter Engine.
 *
 * Implements high-precision conversions across standard SI and Imperial units.
 */

export type UnitCategory =
  "length" | "mass" | "temperature" | "area" | "volume" | "time" | "storage" | "speed" | "pressure";

export interface UnitDefinition {
  id: string;
  name: string;
  symbol: string;
  // Multiplier to convert 1 unit to the base unit of the category
  toBase: number | ((val: number) => number);
  fromBase: number | ((val: number) => number);
}

export interface UnitCategoryData {
  id: UnitCategory;
  name: string;
  baseUnit: string;
  units: UnitDefinition[];
}

export const UNIT_CATEGORIES: Record<UnitCategory, UnitCategoryData> = {
  length: {
    id: "length",
    name: "Length",
    baseUnit: "m",
    units: [
      { id: "mm", name: "Millimeter", symbol: "mm", toBase: 0.001, fromBase: 1000 },
      { id: "cm", name: "Centimeter", symbol: "cm", toBase: 0.01, fromBase: 100 },
      { id: "m", name: "Meter", symbol: "m", toBase: 1, fromBase: 1 },
      { id: "km", name: "Kilometer", symbol: "km", toBase: 1000, fromBase: 0.001 },
      { id: "in", name: "Inch", symbol: "in", toBase: 0.0254, fromBase: 1 / 0.0254 },
      { id: "ft", name: "Foot", symbol: "ft", toBase: 0.3048, fromBase: 1 / 0.3048 },
      { id: "yd", name: "Yard", symbol: "yd", toBase: 0.9144, fromBase: 1 / 0.9144 },
      { id: "mi", name: "Mile", symbol: "mi", toBase: 1609.344, fromBase: 1 / 1609.344 },
    ],
  },
  mass: {
    id: "mass",
    name: "Mass / Weight",
    baseUnit: "kg",
    units: [
      { id: "mg", name: "Milligram", symbol: "mg", toBase: 1e-6, fromBase: 1e6 },
      { id: "g", name: "Gram", symbol: "g", toBase: 0.001, fromBase: 1000 },
      { id: "kg", name: "Kilogram", symbol: "kg", toBase: 1, fromBase: 1 },
      { id: "t", name: "Metric Ton", symbol: "t", toBase: 1000, fromBase: 0.001 },
      { id: "oz", name: "Ounce", symbol: "oz", toBase: 0.028349523125, fromBase: 1 / 0.028349523125 },
      { id: "lb", name: "Pound", symbol: "lb", toBase: 0.45359237, fromBase: 1 / 0.45359237 },
      { id: "st", name: "Stone", symbol: "st", toBase: 6.35029318, fromBase: 1 / 6.35029318 },
    ],
  },
  temperature: {
    id: "temperature",
    name: "Temperature",
    baseUnit: "c",
    units: [
      {
        id: "c",
        name: "Celsius",
        symbol: "°C",
        toBase: (v: number) => v,
        fromBase: (v: number) => v,
      },
      {
        id: "f",
        name: "Fahrenheit",
        symbol: "°F",
        toBase: (v: number) => ((v - 32) * 5) / 9,
        fromBase: (v: number) => (v * 9) / 5 + 32,
      },
      {
        id: "k",
        name: "Kelvin",
        symbol: "K",
        toBase: (v: number) => v - 273.15,
        fromBase: (v: number) => v + 273.15,
      },
    ],
  },
  area: {
    id: "area",
    name: "Area",
    baseUnit: "sq_m",
    units: [
      { id: "sq_cm", name: "Square Centimeter", symbol: "cm²", toBase: 0.0001, fromBase: 10000 },
      { id: "sq_m", name: "Square Meter", symbol: "m²", toBase: 1, fromBase: 1 },
      { id: "sq_km", name: "Square Kilometer", symbol: "km²", toBase: 1e6, fromBase: 1e-6 },
      { id: "sq_ft", name: "Square Foot", symbol: "ft²", toBase: 0.092903, fromBase: 1 / 0.092903 },
      { id: "ac", name: "Acre", symbol: "ac", toBase: 4046.8564224, fromBase: 1 / 4046.8564224 },
      { id: "ha", name: "Hectare", symbol: "ha", toBase: 10000, fromBase: 0.0001 },
    ],
  },
  volume: {
    id: "volume",
    name: "Volume",
    baseUnit: "l",
    units: [
      { id: "ml", name: "Milliliter", symbol: "mL", toBase: 0.001, fromBase: 1000 },
      { id: "l", name: "Liter", symbol: "L", toBase: 1, fromBase: 1 },
      { id: "cu_m", name: "Cubic Meter", symbol: "m³", toBase: 1000, fromBase: 0.001 },
      { id: "fl_oz", name: "Fluid Ounce (US)", symbol: "fl oz", toBase: 0.0295735, fromBase: 1 / 0.0295735 },
      { id: "cup", name: "Cup (US)", symbol: "cup", toBase: 0.236588, fromBase: 1 / 0.236588 },
      { id: "pt", name: "Pint (US)", symbol: "pt", toBase: 0.473176, fromBase: 1 / 0.473176 },
      { id: "gal", name: "Gallon (US)", symbol: "gal", toBase: 3.78541, fromBase: 1 / 3.78541 },
    ],
  },
  time: {
    id: "time",
    name: "Time",
    baseUnit: "s",
    units: [
      { id: "ms", name: "Millisecond", symbol: "ms", toBase: 0.001, fromBase: 1000 },
      { id: "s", name: "Second", symbol: "s", toBase: 1, fromBase: 1 },
      { id: "min", name: "Minute", symbol: "min", toBase: 60, fromBase: 1 / 60 },
      { id: "hr", name: "Hour", symbol: "hr", toBase: 3600, fromBase: 1 / 3600 },
      { id: "day", name: "Day", symbol: "d", toBase: 86400, fromBase: 1 / 86400 },
      { id: "wk", name: "Week", symbol: "wk", toBase: 604800, fromBase: 1 / 604800 },
      { id: "yr", name: "Year", symbol: "yr", toBase: 31536000, fromBase: 1 / 31536000 },
    ],
  },
  storage: {
    id: "storage",
    name: "Digital Storage",
    baseUnit: "byte",
    units: [
      { id: "bit", name: "Bit", symbol: "b", toBase: 0.125, fromBase: 8 },
      { id: "byte", name: "Byte", symbol: "B", toBase: 1, fromBase: 1 },
      { id: "kb", name: "Kilobyte (10³)", symbol: "KB", toBase: 1000, fromBase: 1 / 1000 },
      { id: "kib", name: "Kibibyte (2¹⁰)", symbol: "KiB", toBase: 1024, fromBase: 1 / 1024 },
      { id: "mb", name: "Megabyte (10⁶)", symbol: "MB", toBase: 1e6, fromBase: 1e-6 },
      { id: "mib", name: "Mebibyte (2²⁰)", symbol: "MiB", toBase: 1048576, fromBase: 1 / 1048576 },
      { id: "gb", name: "Gigabyte (10⁹)", symbol: "GB", toBase: 1e9, fromBase: 1e-9 },
      { id: "gib", name: "Gibibyte (2³⁰)", symbol: "GiB", toBase: 1073741824, fromBase: 1 / 1073741824 },
      { id: "tb", name: "Terabyte (10¹²)", symbol: "TB", toBase: 1e12, fromBase: 1e-12 },
      { id: "tib", name: "Tebibyte (2⁴⁰)", symbol: "TiB", toBase: 1099511627776, fromBase: 1 / 1099511627776 },
    ],
  },
  speed: {
    id: "speed",
    name: "Speed",
    baseUnit: "m_s",
    units: [
      { id: "m_s", name: "Meters per second", symbol: "m/s", toBase: 1, fromBase: 1 },
      { id: "km_h", name: "Kilometers per hour", symbol: "km/h", toBase: 1 / 3.6, fromBase: 3.6 },
      { id: "mph", name: "Miles per hour", symbol: "mph", toBase: 0.44704, fromBase: 1 / 0.44704 },
      { id: "knot", name: "Knot", symbol: "kn", toBase: 0.514444, fromBase: 1 / 0.514444 },
    ],
  },
  pressure: {
    id: "pressure",
    name: "Pressure",
    baseUnit: "pa",
    units: [
      { id: "pa", name: "Pascal", symbol: "Pa", toBase: 1, fromBase: 1 },
      { id: "kpa", name: "Kilopascal", symbol: "kPa", toBase: 1000, fromBase: 0.001 },
      { id: "bar", name: "Bar", symbol: "bar", toBase: 100000, fromBase: 1e-5 },
      { id: "psi", name: "Pounds per sq inch", symbol: "psi", toBase: 6894.757, fromBase: 1 / 6894.757 },
      { id: "atm", name: "Standard atmosphere", symbol: "atm", toBase: 101325, fromBase: 1 / 101325 },
      { id: "mmhg", name: "Millimeter of mercury", symbol: "mmHg", toBase: 133.322, fromBase: 1 / 133.322 },
    ],
  },
};

/**
 * Converts a numerical value from one unit to another within the same category.
 */
export function convertUnit(val: number, fromUnitId: string, toUnitId: string, category: UnitCategory): number | null {
  if (!Number.isFinite(val)) return null;

  const catData = UNIT_CATEGORIES[category];
  if (!catData) return null;

  const fromUnit = catData.units.find((u) => u.id === fromUnitId);
  const toUnit = catData.units.find((u) => u.id === toUnitId);

  if (!fromUnit || !toUnit) return null;
  if (fromUnitId === toUnitId) return val;

  // Convert to base
  const baseValue = typeof fromUnit.toBase === "function" ? fromUnit.toBase(val) : val * fromUnit.toBase;

  // Convert from base
  const result = typeof toUnit.fromBase === "function" ? toUnit.fromBase(baseValue) : baseValue * toUnit.fromBase;

  return result;
}
