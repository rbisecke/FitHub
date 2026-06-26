export function parseTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  if (digits.length <= 2) {
    const s = parseInt(digits, 10);
    if (s < 60) return `0:${String(s).padStart(2, "0")}`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }
  const secs = parseInt(digits.slice(-2), 10);
  const mins = parseInt(digits.slice(0, -2), 10);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function timeTextToSeconds(normalised: string): number | null {
  const match = normalised.match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return parseInt(match[1]!, 10) * 60 + parseInt(match[2]!, 10);
}
