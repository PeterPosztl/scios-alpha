/**
 * Honesty-flag readers.
 *
 * Safety invariants across this package are declared as literal `false` / fixed
 * string constants (autoTrade, autoApply, autoAudit, liveSiem, kafka, ...). The
 * wave builders then assert those observed values to produce verdicts such as
 * "if automation ever reports enabled, the verdict is FAIL".
 *
 * Comparing a literal-typed constant against the opposite literal is provably
 * dead at the type level, so TypeScript rejects it. The guards must stay live:
 * a constant that gets flipped has to surface as FAIL rather than be erased at
 * compile time. These readers keep the runtime check and make the intent
 * explicit instead of incidental.
 */

/** True only when the observed flag is exactly `true`. */
export function isOn(flag: unknown): boolean {
  return flag === true;
}

/** True only when the observed flag is exactly `false`. */
export function isOff(flag: unknown): boolean {
  return flag === false;
}

/** True when the observed value equals the given marker. */
export function isState(value: unknown, marker: string): boolean {
  return value === marker;
}
