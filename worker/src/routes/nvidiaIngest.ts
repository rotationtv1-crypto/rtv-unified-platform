import { Env } from '../types';

interface SRSConfig {
  inputResolution: string;
  outputResolution: string;
  model: 'cosmos-sr' | 'cosmos-sr-fast';
  sharpness: number;
}

const DEFAULT_SRS_CONFIG: SRSConfig = {
  inputResolution: '720p',
  outputResolution: '4k',
  model: 'cosmos-sr-fast',
  sharpness: 0.7,
};

export async function handleNvidiaUpscale(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json<{
    streamId: string;
    frameUrl: string;
    config?: Partial<SRSConfig>;
  }>();

  if (!body.streamId || !body.frameUrl) {
    return Response.json({ error: 'Missing streamId or frameUrl' }, { status: 400 });
  }

  const config = { ...DEFAULT_SRS_CONFIG, ...body.config };

  // Call NVIDIA Cosmos Super Resolution Service
  const nvidiaRes = await fetch('https://api.nvcf.nvidia.com/v2/nvcf/exec/run', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.NVIDIA_API_KEY}`,
      'Content-Type': 'application/json',
      'NVCF-FUNCTION': 'cosmos-super-resolution',
    },
    body: JSON.stringify({
      input: {
        image_url: body.frameUrl,
        target_resolution: config.outputResolution,
        model: config.model,
        sharpness: config.sharpness,
      },
    }),
  });

  if (!nvidiaRes.ok) {
    const err = await nvidiaRes.text();
    return Response.json(
      { error: 'NVIDIA SRS processing failed', details: err },
      { status: 502 }
    );
  }

  const result = await nvidiaRes.json<any>();

  // Log processing metrics
  await env.DB.prepare(
    `INSERT INTO srs_processing_log (stream_id, input_res, output_res, model, processing_ms, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  )
    .bind(body.streamId, config.inputResolution, config.outputResolution, config.model, result.processing_time_ms || 0)
    .run();

  return Response.json({
    success: true,
    upscaledUrl: result.output?.image_url,
    processingMs: result.processing_time_ms,
    config,
  });
}

export async function handleSRSStatus(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const streamId = url.searchParams.get('streamId');

  if (!streamId) {
    return Response.json({ error: 'Missing streamId' }, { status: 400 });
  }

  const stats = await env.DB.prepare(
    `SELECT COUNT(*) as total, AVG(processing_ms) as avg_ms, MAX(processing_ms) as max_ms
     FROM srs_processing_log WHERE stream_id = ?`
  )
    .bind(streamId)
    .first();

  return Response.json({ streamId, stats });
}
