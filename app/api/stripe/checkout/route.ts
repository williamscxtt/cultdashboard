import { NextRequest, NextResponse } from 'next/server'

/**
 * Compatibility endpoint for an older cached version of the subscribe page.
 * The Dashboard is included with Creator Cult, so this must never create a
 * second subscription.
 */
export async function POST(req: NextRequest) {
  const origin = new URL(req.url).origin
  return NextResponse.json({
    url: `${origin}/client-access`,
    migrated: true,
  })
}
