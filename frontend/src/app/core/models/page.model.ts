/** Spring Data page as serialised by the backend. */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

/**
 * Formats a Date as a zone-less local timestamp ("2026-10-02T14:30:00") for backend LocalDateTime fields.
 * Never use toISOString() for these: it converts to UTC and shifts the stored time.
 */
export function toLocalDateTime(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}:${p(date.getSeconds())}`;
}

/** Formats a Date as "yyyy-MM-dd" for backend LocalDate fields (local calendar day, not UTC). */
export function toLocalDate(date: Date): string {
  return toLocalDateTime(date).substring(0, 10);
}

/** Value for an <input type="datetime-local"> ("2026-10-02T14:30"). */
export function toDateTimeInput(date: Date): string {
  return toLocalDateTime(date).substring(0, 16);
}

/** Turns a backend error response into a human-readable message. */
export function errorMessage(err: any, fallback = 'Something went wrong. Please try again.'): string {
  const body = err?.error;
  if (body?.fieldErrors?.length) {
    return body.fieldErrors.map((f: any) => `${f.field}: ${f.message}`).join(' · ');
  }
  return body?.message || err?.message || fallback;
}
