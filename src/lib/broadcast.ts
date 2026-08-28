/**
 * Broadcast lifecycle management.
 * Handles cleanup of stale streams and resource deallocation.
 */

export interface BroadcastSession {
  uid: string;
  streamId: string;
  startedAt: number;
  status: 'live' | 'idle' | 'terminated';
}

const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function isStale(session: BroadcastSession): boolean {
  return (
    session.status === 'idle' &&
    Date.now() - session.startedAt > STALE_THRESHOLD_MS
  );
}

export function cleanupStaleSessions(
  sessions: BroadcastSession[]
): BroadcastSession[] {
  return sessions.filter((s) => !isStale(s));
}

export function terminateSession(
  session: BroadcastSession
): BroadcastSession {
  return { ...session, status: 'terminated' };
}
