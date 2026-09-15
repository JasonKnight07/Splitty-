import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto min-h-full w-full max-w-md px-4 pb-28 pt-6 ${className}`}>{children}</div>
}

export function ScreenHeader({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  const Comp = onClick ? 'button' : 'div'
  const hasCustomBg = /\bbg-/.test(className)
  const hasCustomRadius = /\brounded-/.test(className)
  return (
    <Comp
      onClick={onClick}
      className={`tap-highlight-none w-full ${hasCustomRadius ? '' : 'rounded-xl2'} border border-ink-100 ${hasCustomBg ? '' : 'bg-white'} p-4 text-left shadow-card ${
        onClick ? 'transition active:scale-[0.98] active:shadow-none' : ''
      } ${className}`}
    >
      {children}
    </Comp>
  )
}

const VARIANTS = {
  primary: 'bg-brand-600 text-white active:bg-brand-700 shadow-card',
  secondary: 'bg-ink-100 text-ink-800 active:bg-ink-200',
  ghost: 'bg-transparent text-brand-700 active:bg-brand-50',
  danger: 'bg-red-50 text-red-600 active:bg-red-100',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof VARIANTS }) {
  return (
    <button
      className={`tap-highlight-none inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}

const BADGE_TONES = {
  brand: 'bg-brand-100 text-brand-800',
  ink: 'bg-ink-100 text-ink-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
}

export function Badge({ children, tone = 'ink' }: { children: ReactNode; tone?: keyof typeof BADGE_TONES }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  )
}

const AVATAR_COLORS = [
  'bg-brand-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-teal-500',
  'bg-fuchsia-500',
]

export function avatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-9 w-9 text-sm', lg: 'h-14 w-14 text-lg' }
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${avatarColor(name)} ${sizes[size]}`}
    >
      {initials || '?'}
    </div>
  )
}

export function EmptyState({ icon, title, subtitle }: { icon: string; title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      <div className="mb-3 text-4xl">{icon}</div>
      <p className="font-semibold text-ink-700">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
    </div>
  )
}
