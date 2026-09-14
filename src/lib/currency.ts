const CURRENCY_KEY = 'splitty.currency'

export function getCurrency(): string {
  if (typeof window === 'undefined') return 'USD'
  return window.localStorage.getItem(CURRENCY_KEY) || 'USD'
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
