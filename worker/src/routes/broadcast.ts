import { Env } from '../types';

export async function handleBroadcastCleanup(
  request: Request,
  env: Env
): Promise<Response> {
  const now = Date.now();
  const staleThreshold = 30 * 60 * 1000;

  // Query active sessions from D1
  const db = env.DB;
  const stale = await db
    .prepare(
      `SELECT uid, stream_id FROM broadcast_sessions WHERE status = 'idle' AND started_at < ?`
    )
    .bind(now - staleThreshold)
    .all();

  if (!stale.results?.length) {
    return Response.json({ cleaned: 0, message: 'No stale sessions' });
  }

  // Terminate stale sessions
  const ids = stale.results.map((r: any) => r.uid);
  await db
    .prepare(
      `UPDATE broadcast_sessions SET status = 'terminated' WHERE uid IN (${ids.map(() => '?').join(',')})`
    )
    .bind(...ids)
    .run();

  return Response.json({
    cleaned: ids.length,
    terminated: ids,
    timestamp: new Date().toISOString(),
  });
}
