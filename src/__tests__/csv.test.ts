import { describe, it, expect } from 'vitest';
import { generateCsv } from '@/lib/csv';

interface Row {
  name: string;
  email: string;
  count: number;
}

const COLUMNS = [
  { header: 'Name',  getValue: (r: Row) => r.name },
  { header: 'Email', getValue: (r: Row) => r.email },
  { header: 'Count', getValue: (r: Row) => String(r.count) },
];

describe('generateCsv()', () => {
  it('produces a header row', () => {
    const csv = generateCsv(COLUMNS, []);
    expect(csv).toBe('Name,Email,Count\n');
  });

  it('produces one data row per item', () => {
    const rows: Row[] = [
      { name: 'Alice', email: 'alice@example.com', count: 3 },
      { name: 'Bob',   email: 'bob@example.com',   count: 7 },
    ];
    const lines = generateCsv(COLUMNS, rows).split('\n');
    expect(lines).toHaveLength(3); // header + 2 rows
    expect(lines[1]).toBe('Alice,alice@example.com,3');
    expect(lines[2]).toBe('Bob,bob@example.com,7');
  });

  it('wraps cells that contain commas in double quotes', () => {
    const rows: Row[] = [{ name: 'Smith, John', email: 'j@example.com', count: 1 }];
    const csv = generateCsv(COLUMNS, rows);
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes double quotes inside cells', () => {
    const rows: Row[] = [{ name: 'He said "hi"', email: 'x@example.com', count: 0 }];
    const csv = generateCsv(COLUMNS, rows);
    expect(csv).toContain('"He said ""hi"""');
  });
});
