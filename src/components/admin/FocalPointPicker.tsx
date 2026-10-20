'use client';

import { useRef, useState } from 'react';
import { Crosshair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

interface FocalPointPickerProps {
  src: string;
  alt: string;
  /** % across and down; null is the centre */
  x: number | null | undefined;
  y: number | null | undefined;
  onChange: (point: { x: number | null; y: number | null }) => void;
}

/** The shapes the site crops recipe photos to */
const CROPS = [
  { label: 'Recipe page, phone', ratio: '1 / 1', width: 'w-20' },
  { label: 'Recipe page, desktop', ratio: '9 / 10', width: 'w-[4.5rem]' },
  { label: 'Recipe card', ratio: '4 / 3', width: 'w-[6.5rem]' },
];

/**
 * Click or drag on the whole photo to choose the part that matters. Wherever
 * the site crops the photo, it keeps that point in view; the previews show how.
 */
export function FocalPointPicker({ src, alt, x, y, onChange }: FocalPointPickerProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const px = x ?? 50;
  const py = y ?? 50;
  const isCentre = px === 50 && py === 50;

  function pointAt(clientX: number, clientY: number) {
    const box = imgRef.current?.getBoundingClientRect();
    if (!box?.width || !box.height) return;
    const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
    onChange({ x: clamp(((clientX - box.left) / box.width) * 100), y: clamp(((clientY - box.top) / box.height) * 100) });
  }

  function nudge(dx: number, dy: number) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n));
    onChange({ x: clamp(px + dx), y: clamp(py + dy) });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
      <div>
        <div
          className={cn('relative touch-none select-none overflow-hidden rounded-lg border border-border', dragging ? 'cursor-grabbing' : 'cursor-crosshair')}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            setDragging(true);
            pointAt(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => dragging && pointAt(e.clientX, e.clientY)}
          onPointerUp={() => setDragging(false)}
          onPointerCancel={() => setDragging(false)}
        >
          {/* The whole photo, uncropped, so any part can be chosen */}
          {/* eslint-disable-next-line @next/next/no-img-element -- needs its natural shape, not a fixed box */}
          <img ref={imgRef} src={src} alt={alt} draggable={false} className="block h-auto w-full" />
          <button
            type="button"
            onKeyDown={(e) => {
              const step = e.shiftKey ? 10 : 1;
              const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
              if (!moves[e.key]) return;
              e.preventDefault();
              nudge(...moves[e.key]);
            }}
            onPointerDown={(e) => e.preventDefault()}
            aria-label={`Focal point: ${px}% across, ${py}% down. Use the arrow keys to move it.`}
            className="absolute size-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-primary/40 shadow-[0_0_0_1.5px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            style={{ left: `${px}%`, top: `${py}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Crosshair size={13} /> Click or drag on the photo to set the focal point
          </span>
          <Button type="button" variant="ghost" size="sm" disabled={isCentre} onClick={() => onChange({ x: null, y: null })}>
            Reset to centre
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">How it&rsquo;s cropped</p>
        <ul className="mt-2 flex flex-wrap items-end gap-3">
          {CROPS.map((c) => (
            <li key={c.label} className={cn('grid gap-1.5', c.width)}>
              <span className="relative block overflow-hidden rounded-md bg-muted" style={{ aspectRatio: c.ratio }}>
                {/* eslint-disable-next-line @next/next/no-img-element -- preview of the crop */}
                <img src={src} alt="" className="absolute inset-0 size-full object-cover" style={{ objectPosition: `${px}% ${py}%` }} />
              </span>
              <span className="text-[0.6875rem] leading-tight text-muted-foreground">{c.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
