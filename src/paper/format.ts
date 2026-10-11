// Small formatting helpers shared by the pages and the interactive parts.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** '2026-04-12' → '12 April 2026'. Anything else is returned as written. */
export function formatDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return iso
  const month = MONTHS[Number(m[2]) - 1]
  return month ? `${Number(m[3])} ${month} ${m[1]}` : iso
}

/** 'ASH_COATED_OSMIUM' → 'Ash coated osmium' (sentence case everywhere). */
export function productName(raw: string): string {
  const words = raw.toLowerCase().split('_').filter(Boolean)
  if (words.length === 0) return raw
  return [words[0].charAt(0).toUpperCase() + words[0].slice(1), ...words.slice(1)].join(' ')
}

/** 5.46 → '5 min 28 s'; 0.86 → '52 s'. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60))
  const m = Math.floor(total / 60)
  const s = total % 60
  return m > 0 ? `${m} min ${s} s` : `${s} s`
}

/** 328 → '5:28', a countdown style for the mission panel. */
export function formatCountdown(minutes: number): string {
  const total = Math.max(0, Math.round(minutes * 60))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Thousands separated with a comma, up to one decimal place. */
export function formatNumber(value: number, decimals = 0): string {
  return value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

/** 'Usman, Haseeb and Karim'. */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join('')
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}
