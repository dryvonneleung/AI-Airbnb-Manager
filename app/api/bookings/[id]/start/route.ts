import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';

/**
 * POST /api/bookings/[id]/start
 * Cleaner marks the job started → status `in_progress`.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', params.id)
    .single();

  if (!booking || booking.cleaner_id !== session.userId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (booking.status !== 'confirmed') {
    return NextResponse.json(
      { error: 'Job must be confirmed before starting.' },
      { status: 409 }
    );
  }

  const { data: updated, error } = await supabase
    .from('bookings')
    .update({ status: 'in_progress' })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ booking: updated });
}
