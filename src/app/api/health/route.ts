import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
const timestamp = new Date().toISOString();

  try {
    const supabase = await createClient();
    // Lightweight DB ping — select a single constant to verify connectivity
    const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle();

    if (error) {
      return NextResponse.json(
        { status: 'degraded', db: 'unreachable', error: error.message, timestamp },
        { status: 503 }
      );
    }

    return NextResponse.json({ status: 'ok', db: 'ok', timestamp });
  } catch {
    return NextResponse.json(
      { status: 'error', db: 'unreachable', timestamp },
      { status: 503 }
    );
  }
}
