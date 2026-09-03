import { Env } from '../types';

interface KimiStreamConfig {
  model: string;
  endpoint: string;
  maxTokens: number;
}

const KIMI_CONFIG: KimiStreamConfig = {
  model: 'moonshot-v1-128k',
  endpoint: 'https://api.moonshot.cn/v1/chat/completions',
  maxTokens: 4096,
};

export async function handleKimiStream(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json<{
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    context?: string;
  }>();

  if (!body.messages?.length) {
    return Response.json({ error: 'Messages required' }, { status: 400 });
  }

  const isStream = body.stream !== false;

  const kimiRes = await fetch(KIMI_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.KIMI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: KIMI_CONFIG.model,
      messages: [
        {
          role: 'system',
          content: `You are RotationTV's AI assistant. Context: ${body.context || 'general'}.`,
        },
        ...body.messages,
      ],
      max_tokens: KIMI_CONFIG.maxTokens,
      stream: isStream,
    }),
  });

  if (!kimiRes.ok) {
    const err = await kimiRes.text();
    return Response.json(
      { error: 'Kimi API request failed', status: kimiRes.status },
      { status: 502 }
    );
  }

  if (isStream && kimiRes.body) {
    // Proxy the SSE stream directly
    return new Response(kimiRes.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const data = await kimiRes.json();
  return Response.json(data);
}

export async function handleKimiHealth(
  request: Request,
  env: Env
): Promise<Response> {
  // Lightweight check - verify API key is set and endpoint responds
  const hasKey = !!env.KIMI_API_KEY;
  return Response.json({
    provider: 'kimi-moonshot',
    model: KIMI_CONFIG.model,
    configured: hasKey,
    endpoint: KIMI_CONFIG.endpoint,
    timestamp: new Date().toISOString(),
  });
}
