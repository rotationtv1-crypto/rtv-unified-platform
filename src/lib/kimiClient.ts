/**
 * Kimi Cloud streaming client for the RotationTV frontend.
 * Handles SSE streaming from the Kimi/Moonshot API via the Worker proxy.
 */

export interface KimiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface KimiStreamCallbacks {
  onToken: (token: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export async function streamKimiChat(
  apiUrl: string,
  messages: KimiMessage[],
  callbacks: KimiStreamCallbacks
): Promise<void> {
  const res = await fetch(`${apiUrl}/kimi/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, stream: true }),
  });

  if (!res.ok || !res.body) {
    callbacks.onError(new Error(`Kimi stream failed: ${res.status}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          callbacks.onComplete(fullText);
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || '';
          if (token) {
            fullText += token;
            callbacks.onToken(token);
          }
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  }

  callbacks.onComplete(fullText);
}
