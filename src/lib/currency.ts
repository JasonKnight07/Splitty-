const CURRENCY_KEY = 'splitty.currency'

/** Change this to switch Splitty's default currency for everyone who hasn't picked their own in Settings. */
export const DEFAULT_CURRENCY = 'ZAR'

export function getCurrency(): string {
  if (typeof window === 'undefined') return DEFAULT_CURRENCY
  return window.localStorage.getItem(CURRENCY_KEY) || DEFAULT_CURRENCY
}

export function setCurrency(code: string) {
  window.localStorage.setItem(CURRENCY_KEY, code)
}

export function formatCurrency(amount: number, currency = getCurrency()): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
