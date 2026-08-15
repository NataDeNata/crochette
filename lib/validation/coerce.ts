/**
 * An optional number field, as it arrives from a form, turned into a column
 * value.
 *
 * The schemas leave these as `number | "" | undefined`: a cleared input posts
 * an empty string, an absent one posts nothing, and both mean "no value" — but
 * `""` is not nullish, so `?? null` alone lets it through to a numeric column.
 */
export function blankToNull(value: number | "" | undefined): number | null {
  return value === "" || value === undefined ? null : value;
}

/** The same, converting pesos to the integer centavos the column stores. */
export function blankToCents(value: number | "" | undefined): number | null {
  const amount = blankToNull(value);
  return amount === null ? null : Math.round(amount * 100);
}
