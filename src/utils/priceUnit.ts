// Shared price-unit helpers for Rate GPT.
// Official source unit (AGMARKNET/OGD) is Rs/Quintal, so:
//   per kg = per quintal / 100
//   per quintal = per kg * 100
// Original source prices are never modified; conversion happens only at display time.

export type PriceUnit = "quintal" | "kg";

export const SOURCE_UNIT = "Rs/Quintal";

export function convertPrice(
  value: number | null | undefined,
  unit: PriceUnit,
): number | null {
  if (value === null || value === undefined) return null;
  if (unit === "kg") return value / 100;
  return value;
}

export function unitLabel(unit: PriceUnit): string {
  return unit === "kg" ? "Kg" : "Quintal";
}

export function formatPrice(
  value: number | null | undefined,
  unit: PriceUnit,
): string {
  const v = convertPrice(value, unit);
  if (v === null) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })} / ${unitLabel(unit)}`;
}

export function formatPriceCompact(
  value: number | null | undefined,
  unit: PriceUnit,
): string {
  const v = convertPrice(value, unit);
  if (v === null) return "—";
  return `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
