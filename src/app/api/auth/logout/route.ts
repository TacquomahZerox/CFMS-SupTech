import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, getSessionFromRequest } from '@/lib/auth';
import { createAuditLog } from '@/services/audit.service';

export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromRequest(request);

    if (session) {
      await createAuditLog({
        userId: session.userId,
        action: 'LOGOUT',
        entityType: 'User',
        entityId: session.userId,
      });
    }

    await clearSessionCookie();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  }
}
