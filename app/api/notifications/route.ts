import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSessionProfile } from '@/lib/auth';

/** GET /api/notifications — current user's notifications (newest first). */
export async function GET() {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createClient();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', session.userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ notifications: data ?? [] });
}

/** PATCH /api/notifications — mark all (or one) as read. */
export async function PATCH(req: Request) {
  const session = await getSessionProfile();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json().catch(() => ({ id: undefined }));
  const supabase = createClient();
  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', session.userId);
  if (id) query = query.eq('id', id);
  const { error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
