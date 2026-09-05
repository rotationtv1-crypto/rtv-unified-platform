import { Env } from '../types';
import { buildPipelineConfig, getStreamStatus } from '../streaming/pipeline';

export async function handlePipelineStart(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json<{ streamId: string; streamKey: string }>();

  if (!body.streamId || !body.streamKey) {
    return Response.json({ error: 'Missing streamId or streamKey' }, { status: 400 });
  }

  const config = buildPipelineConfig(body.streamId, body.streamKey, env);

  // Register stream in D1
  await env.DB.prepare(
    `INSERT OR REPLACE INTO active_streams (stream_id, status, config, started_at)
     VALUES (?, 'ingesting', ?, datetime('now'))`
  )
    .bind(body.streamId, JSON.stringify(config))
    .run();

  return Response.json({
    success: true,
    pipeline: config,
    playbackUrl: `https://customer-streams.cloudflarestream.com/${body.streamId}/manifest/video.m3u8`,
  });
}

export async function handlePipelineStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const streamId = url.searchParams.get('streamId');

  if (!streamId) {
    return Response.json({ error: 'Missing streamId parameter' }, { status: 400 });
  }

  const status = await getStreamStatus(streamId, env);

  if (!status) {
    return Response.json({ error: 'Stream not found' }, { status: 404 });
  }

  return Response.json(status);
}

export async function handlePipelineStop(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json<{ streamId: string }>();

  if (!body.streamId) {
    return Response.json({ error: 'Missing streamId' }, { status: 400 });
  }

  await env.DB.prepare(
    `UPDATE active_streams SET status = 'idle', stopped_at = datetime('now') WHERE stream_id = ?`
  )
    .bind(body.streamId)
    .run();

  return Response.json({ success: true, streamId: body.streamId, status: 'stopped' });
}
