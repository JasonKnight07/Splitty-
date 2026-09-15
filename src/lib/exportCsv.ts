import type { SavedReceipt } from '../types'

export function downloadExpensesCsv(receipts: SavedReceipt[], filename = 'splitty-expenses.csv') {
  const header = ['Date', 'Merchant', 'Category', 'Total', 'Notes']
  const rows = receipts.map((r) => [r.date, r.merchant, r.category, r.total.toFixed(2), r.notes ?? ''])
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
