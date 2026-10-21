export function formatLocalTime(timeZone: string, date = new Date()): string {
  return new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(date);
}
