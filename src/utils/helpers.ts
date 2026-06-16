export function sanitizeInput(input: string): string {
  return input.replace(/[<>"'&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;', '&': '&amp;' }[c] || c))
}

export function maskIdCard(id: string): string {
  if (!id || id.length < 8) return id
  return id.slice(0, 4) + '****' + id.slice(-4)
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function safeParseDate(dateStr: string): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

export function generateUniqueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}
