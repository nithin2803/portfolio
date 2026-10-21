// Dates are plain YYYY-MM-DD; format in UTC so they never shift a day.
const fmt = new Intl.DateTimeFormat('en-US', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatDate(iso: string): string {
  return fmt.format(new Date(`${iso}T00:00:00Z`));
}
