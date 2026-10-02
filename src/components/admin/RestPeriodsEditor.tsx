'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DEFAULT_WHEN, REST_TYPES, REST_TYPE_INFO, durationInput, parseDuration, restWhen, type RestPeriod, type RestType, type RestWhen } from '@/lib/rest';
import { cn } from '@/utils/cn';
import { formatMinutesLong } from '@/lib/time';

interface Row {
  key: string;
  type: RestType;
  label: string;
  text: string;
  when: RestWhen;
}

const toRows = (periods: RestPeriod[]): Row[] =>
  periods.map((p, i) => ({ key: `r${i}-${p.type}`, type: p.type, label: p.label ?? '', text: durationInput(p.minutes), when: restWhen(p) }));

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
        .map((r) => {
          const period: RestPeriod = { type: r.type, minutes: parseDuration(r.text) ?? 0 };
          if (r.type === 'other' && r.label.trim()) period.label = r.label;
          // Only kept when moved from the type's usual position
          if (r.when !== DEFAULT_WHEN[r.type]) period.when = r.when;
          return period;
        })
        .filter((p) => p.minutes > 0)
    );
  }

  const update = (key: string, patch: Partial<Row>) => commit(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <p className="text-sm font-medium">Rest times</p>
        <p className="text-xs text-muted-foreground">Shown in cooking order, before or after the cook time. Each one counts towards the total.</p>
      </div>

      {rows.length > 0 && (
        <ul className="mb-3 grid gap-2">
          {rows.map((row) => {
            const minutes = parseDuration(row.text);
            const invalid = row.text.trim() !== '' && minutes == null;
            return (
              <li key={row.key} className="grid gap-2 rounded-lg border border-border bg-muted/30 p-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto_9rem_auto] sm:items-start">
                {/* Changing the kind resets its position to the usual one (prove → before, set → after) */}
                <Select value={row.type} onValueChange={(v) => update(row.key, { type: v as RestType, when: DEFAULT_WHEN[v as RestType] })}>
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

                <div className="inline-flex h-9 rounded-md border border-border p-0.5" role="group" aria-label="When this happens">
                  {(['before', 'after'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => update(row.key, { when: w })}
                      aria-pressed={row.when === w}
                      className={cn(
                        'whitespace-nowrap rounded px-2.5 text-xs font-medium transition-colors',
                        row.when === w ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      {w === 'before' ? 'Before cooking' : 'After cooking'}
                    </button>
                  ))}
                </div>

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
        onClick={() => commit([...rows, { key: `r${Date.now()}`, type: 'rest', label: '', text: '', when: DEFAULT_WHEN.rest }])}
      >
        <Plus size={14} /> Add a rest
      </Button>
    </div>
  );
}
