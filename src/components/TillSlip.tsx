import type { ReactNode } from 'react'

export function TillSlip({
  children,
  className = '',
  torn = false,
}: {
  children: ReactNode
  className?: string
  torn?: boolean
}) {
  return (
    <div
      className={`relative rounded-md border border-paper-200 bg-paper-50 p-4 font-mono text-paper-text shadow-card ${
        torn ? 'slip-torn-top -rotate-1' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

export function SlipHeader({ merchant, date, label }: { merchant: string; date: string; label?: string }) {
  return (
    <div className="mb-3 border-b border-dashed border-paper-300 pb-3 text-center">
      {label && <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-paper-faint">{label}</p>}
      <p className="text-sm font-bold uppercase tracking-wide">{merchant || 'Receipt'}</p>
      <p className="text-[11px] text-paper-faint">
        {new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
      </p>
    </div>
  )
}

export function SlipRow({
  left,
  right,
  subtitle,
  onClick,
  muted,
}: {
  left: ReactNode
  right: ReactNode
  subtitle?: ReactNode
  onClick?: () => void
  muted?: boolean
}) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp
      onClick={onClick}
      className={`block w-full py-1.5 text-left text-[13px] transition ${muted ? 'opacity-40' : ''} ${
        onClick ? 'tap-highlight-none active:opacity-60' : ''
      }`}
    >
      <span className="flex items-baseline gap-2">
        <span className="min-w-0 shrink-0">{left}</span>
        <span className="mt-1 h-0 flex-1 border-b border-dotted border-paper-300" />
        <span className="shrink-0 font-semibold tabular-nums">{right}</span>
      </span>
      {subtitle && <span className="mt-0.5 block text-[11px] text-paper-faint">{subtitle}</span>}
    </Comp>
  )
}

export function SlipDivider() {
  return <div className="my-2 border-t border-dashed border-paper-300" />
}

export function SlipTotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-0.5 text-[13px] ${strong ? 'text-sm font-bold' : 'text-paper-faint'}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
