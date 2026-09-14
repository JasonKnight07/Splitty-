import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/scan', label: 'Scan', icon: '📷', end: false },
  { to: '/receipts', label: 'Receipts', icon: '🗂️', end: false },
  { to: '/settings', label: 'Settings', icon: '⚙️', end: false },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-md items-stretch justify-between px-2 pb-[env(safe-area-inset-bottom)]">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition ${
                isActive ? 'text-brand-700' : 'text-ink-400'
              }`
            }
          >
            <span className="text-xl leading-none">{tab.icon}</span>
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
