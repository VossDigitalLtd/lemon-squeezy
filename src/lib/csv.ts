/**
 * CSV export utilities.
 *
 * Usage:
 *   import { downloadCsv } from '@/lib/csv';
 *
 *   downloadCsv('users.csv', [
 *     { header: 'Email', getValue: (u) => u.email },
 *     { header: 'Role',  getValue: (u) => u.role },
 *   ], users);
 */

export interface CsvColumn<T> {
  header: string;
  getValue: (row: T) => string;
}

function escapeCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Generates a CSV string from columns and rows.
 * Useful when you want the string rather than triggering a download.
 */
export function generateCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((c) => escapeCell(c.header)).join(',');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.getValue(row))).join(','))
    .join('\n');
  return `${header}\n${body}`;
}

/**
 * Generates a CSV and triggers a browser file download.
 * Must be called in a browser context (client component or event handler).
 */
export function downloadCsv<T>(
  filename: string,
  columns: CsvColumn<T>[],
  rows: T[]
): void {
  const csv = generateCsv(columns, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
