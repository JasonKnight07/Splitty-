import type { TipMode } from '../types'
import { formatCurrency } from '../lib/currency'
import { TIP_RATES } from '../lib/calc'

const PRESETS: { mode: TipMode; label: string }[] = [
  { mode: '10', label: '10%' },
  { mode: '12.5', label: '12.5%' },
  { mode: '15', label: '15%' },
  { mode: 'custom', label: 'Custom' },
]

export function TipSelector({
  tipMode,
  customAmount,
  subtotal,
  onChange,
  onCustomAmount,
}: {
  tipMode: TipMode
  customAmount: number
  subtotal: number
  onChange: (mode: TipMode) => void
  onCustomAmount: (amount: number) => void
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-700">Tip</p>
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.mode}
            onClick={() => onChange(p.mode)}
            className={`rounded-xl border px-2 py-2.5 text-center text-sm font-bold transition ${
              tipMode === p.mode ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-200 bg-white text-ink-700'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {tipMode === 'custom' ? (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-ink-500">Amount</span>
          <input
            type="number"
            step="0.01"
            value={customAmount}
            onChange={(e) => onCustomAmount(Number(e.target.value) || 0)}
            className="w-28 rounded-lg border border-ink-200 px-2 py-1.5 text-right"
          />
        </div>
      ) : tipMode !== 'none' ? (
        <p className="mt-2 text-xs text-ink-400">
          {PRESETS.find((p) => p.mode === tipMode)?.label} of {formatCurrency(subtotal)} ={' '}
          {formatCurrency(subtotal * (TIP_RATES[tipMode] ?? 0))}
        </p>
      ) : null}
      <button onClick={() => onChange('none')} className="mt-2 text-xs font-semibold text-ink-400 underline">
        No tip
      </button>
    </div>
  )
}
