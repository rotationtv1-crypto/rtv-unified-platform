/**
 * Grok AI client for live stream interactions.
 * Connects to the AI Gateway for real-time chat enhancement.
 */

export interface GrokMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GrokStreamOptions {
  apiUrl: string;
  streamId: string;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: Error) => void;
}

export async function streamGrokResponse(
  messages: GrokMessage[],
  options: GrokStreamOptions
): Promise<void> {
  const res = await fetch(`${options.apiUrl}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      stream: true,
      context: { streamId: options.streamId },
    }),
  });

  if (!res.ok || !res.body) {
    options.onError(new Error(`AI response failed: ${res.status}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    options.onChunk(chunk);
  }

  options.onDone();
}
