'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { REST_TYPES, REST_TYPE_INFO, durationInput, parseDuration, type RestPeriod, type RestType } from '@/lib/rest';
import { formatMinutesLong } from '@/lib/time';

interface Row {
  key: string;
  type: RestType;
  label: string;
  text: string;
}

const toRows = (periods: RestPeriod[]): Row[] =>
  periods.map((p, i) => ({ key: `r${i}-${p.type}`, type: p.type, label: p.label ?? '', text: durationInput(p.minutes) }));

/**
 * Rest periods for the recipe form: resting, setting, proving… Each row is a
 * type plus a typed duration ("4h", "1h 30m", "overnight"). Every rest counts
 * towards the recipe's total time.
 */
export function RestPeriodsEditor({ value, onChange }: { value: RestPeriod[]; onChange: (periods: RestPeriod[]) => void }) {
  const [rows, setRows] = useState<Row[]>(() => toRows(value));

  function commit(next: Row[]) {
    setRows(next);
    onChange(
      next
        .map((r) => ({ type: r.type, label: r.label, minutes: parseDuration(r.text) ?? 0 }))
        .filter((p) => p.minutes > 0)
        .map((p) => (p.type === 'other' && p.label.trim() ? p : { type: p.type, minutes: p.minutes }))
    );
  }

  const update = (key: string, patch: Partial<Row>) => commit(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Rest times</p>
        <p className="text-xs text-muted-foreground">Resting, setting, proving… each one counts towards the total time.</p>
      </div>

      {rows.length > 0 && (
        <ul className="mb-3 grid gap-2">
          {rows.map((row) => {
            const minutes = parseDuration(row.text);
            const invalid = row.text.trim() !== '' && minutes == null;
            return (
              <li key={row.key} className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[10rem_minmax(0,1fr)_9rem_auto] sm:items-start">
                <Select value={row.type} onValueChange={(v) => update(row.key, { type: v as RestType })}>
                  <SelectTrigger className="w-full" aria-label="Kind of rest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REST_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {REST_TYPE_INFO[t].option}
                        <span className="ml-1 text-xs text-muted-foreground in-data-[slot=select-value]:hidden">({REST_TYPE_INFO[t].example})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {row.type === 'other' ? (
                  <Input
                    value={row.label}
                    onChange={(e) => update(row.key, { label: e.target.value })}
                    placeholder="What happens, e.g. Freezing"
                    maxLength={40}
                    aria-label="Name of this rest"
                  />
                ) : (
                  <p className="self-center text-sm text-muted-foreground">Shown as &ldquo;{REST_TYPE_INFO[row.type].noun} time&rdquo;</p>
                )}

                <div>
                  <Input
                    value={row.text}
                    onChange={(e) => update(row.key, { text: e.target.value })}
                    placeholder="e.g. 4h, 1h 30m"
                    aria-label="How long"
                    aria-invalid={invalid}
                    className={invalid ? 'border-destructive' : undefined}
                  />
                  <p className={`mt-1 text-xs ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {invalid ? 'Try "45m", "2h" or "overnight"' : minutes ? `= ${formatMinutesLong(minutes)}` : ' '}
                  </p>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => commit(rows.filter((r) => r.key !== row.key))}
                  aria-label="Remove this rest"
                >
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => commit([...rows, { key: `r${Date.now()}`, type: 'rest', label: '', text: '' }])}
      >
        <Plus size={14} /> Add a rest
      </Button>
    </div>
  );
}
