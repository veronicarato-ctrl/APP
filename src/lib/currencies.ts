// Currency codes come from the ISO 4217 list shipped with the browser, never from a hand-written list.

const FALLBACK = ["EUR", "CHF", "USD", "GBP"];

export const CURRENCIES: string[] = (() => {
  try { return Intl.supportedValuesOf("currency"); } catch { return FALLBACK; }
})();

/** "EUR, Euro" in the interface language, or the bare code when the browser has no name for it. */
export function currencyLabel(code: string, locale = "en") {
  try { return `${code}, ${new Intl.DisplayNames([locale], { type: "currency" }).of(code) ?? ""}`.replace(/, $/, ""); }
  catch { return code; }
}
