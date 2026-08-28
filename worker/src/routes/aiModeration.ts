import { Env } from '../types';

interface ModerationRequest {
  streamId: string;
  chatMessage: string;
  userId: string;
}

interface ModerationResult {
  allowed: boolean;
  reason?: string;
  confidence: number;
}

export async function handleAIModeration(
  request: Request,
  env: Env
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json<ModerationRequest>();

  if (!body.streamId || !body.chatMessage || !body.userId) {
    return Response.json(
      { error: 'Missing required fields' },
      { status: 400 }
    );
  }

  // Use Cloudflare AI Gateway for moderation
  const aiRes = await fetch(
    `https://gateway.ai.cloudflare.com/v1/${env.CLOUDFLARE_ACCOUNT_ID}/default/workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.CF_AIG_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'You are a live stream chat moderator. Evaluate the message for: hate speech, harassment, spam, explicit content, or dangerous misinformation. Respond with JSON: {"allowed": boolean, "reason": string|null, "confidence": number 0-1}',
          },
          {
            role: 'user',
            content: `Evaluate this chat message: "${body.chatMessage}"`,
          },
        ],
        max_tokens: 100,
      }),
    }
  );

  if (!aiRes.ok) {
    // Fail open - allow message if AI is unavailable
    return Response.json({ allowed: true, confidence: 0, fallback: true });
  }

  const aiData = await aiRes.json<any>();
  const resultText = aiData.result?.response || aiData.choices?.[0]?.message?.content || '';

  let moderation: ModerationResult;
  try {
    moderation = JSON.parse(resultText);
  } catch {
    moderation = { allowed: true, confidence: 0 };
  }

  // Log moderation action if blocked
  if (!moderation.allowed) {
    await env.DB.prepare(
      `INSERT INTO moderation_log (stream_id, user_id, message, reason, confidence, actioned_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    )
      .bind(body.streamId, body.userId, body.chatMessage, moderation.reason || '', moderation.confidence)
      .run();
  }

  return Response.json(moderation);
}
