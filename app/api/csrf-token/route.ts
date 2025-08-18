/**
 * CSRF token generation endpoint
 */

import { NextRequest } from 'next/server';
import { handleCSRFToken } from '@/lib/security-middleware';

export async function GET(req: NextRequest) {
  return handleCSRFToken(req);
}