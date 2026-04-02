import { callAIEndpoint } from './aiClient';

const ENDPOINT = '/api/ai/chat-completion';

export async function getChatCompletion(
  provider: string,
  model: string,
  messages: object[],
  parameters: object = {}
) {
  return callAIEndpoint(ENDPOINT, {
    provider,
    model,
    messages,
    stream: false,
    parameters,
  });
}

export async function getStreamingChatCompletion(
  provider: string,
  model: string,
  messages: object[],
  onChunk: (chunk: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  parameters: object = {},
  maxRetries: number = 3
) {
  let attempt = 0;
  let accumulatedContent = '';

  const attemptStream = async (): Promise<void> => {
    attempt++;
    const controller = new AbortController();
    // 5-minute timeout per attempt
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages, stream: true, parameters }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const decoder = new TextDecoder();
      let buffer = '';
      let lastChunkTime = Date.now();
      // Stall detection: if no chunk arrives in 30s, abort and retry
      const stallCheckInterval = setInterval(() => {
        if (Date.now() - lastChunkTime > 30000) {
          clearInterval(stallCheckInterval);
          reader.cancel();
          controller.abort();
        }
      }, 5000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lastChunkTime = Date.now();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk' && data.chunk) {
                  const content = data.chunk?.choices?.[0]?.delta?.content;
                  if (content) accumulatedContent += content;
                  onChunk(data.chunk);
                } else if (data.type === 'done') {
                  clearInterval(stallCheckInterval);
                  onComplete();
                  return;
                } else if (data.type === 'error') {
                  clearInterval(stallCheckInterval);
                  const is429 = data.error?.includes('429') || data.error?.toLowerCase?.().includes('rate limit');
                  if (!is429) {
                    console.error('API Route Error:', { error: data.error, details: data.details });
                  }
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                // Skip invalid JSON lines
              }
            }
          }
        }
        clearInterval(stallCheckInterval);
        // Stream ended without explicit 'done' — treat as complete if we have content
        if (accumulatedContent.length > 0) {
          onComplete();
        } else {
          throw new Error('Stream ended without content');
        }
      } finally {
        clearInterval(stallCheckInterval);
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const err = error instanceof Error ? error : new Error('Streaming error');
      const isAbort = err.name === 'AbortError' || err.message.includes('aborted');
      const is429 = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit');
      const isRetryable = isAbort || is429 || err.message.includes('network') || err.message.includes('fetch') || err.message.includes('Stream ended without content');

      if (!is429) {
        console.error(`Streaming error (attempt ${attempt}/${maxRetries}):`, err.message);
      }

      if (isRetryable && attempt < maxRetries) {
        // Exponential backoff: 2s, 4s, 8s
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptStream();
      }

      onError(err);
    }
  };

  await attemptStream();
}

export async function getStreamingChatCompletionWithProgress(
  provider: string,
  model: string,
  messages: object[],
  onChunk: (chunk: any) => void,
  onComplete: () => void,
  onError: (error: Error) => void,
  onRetry: (attempt: number, maxRetries: number) => void,
  parameters: object = {},
  maxRetries: number = 3
) {
  let attempt = 0;
  let accumulatedContent = '';

  const attemptStream = async (): Promise<void> => {
    attempt++;
    if (attempt > 1) onRetry(attempt, maxRetries);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000);

    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, model, messages, stream: true, parameters }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `HTTP error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Response body is not readable');

      const decoder = new TextDecoder();
      let buffer = '';
      let lastChunkTime = Date.now();
      const stallCheckInterval = setInterval(() => {
        if (Date.now() - lastChunkTime > 30000) {
          clearInterval(stallCheckInterval);
          reader.cancel();
          controller.abort();
        }
      }, 5000);

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          lastChunkTime = Date.now();
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk' && data.chunk) {
                  const content = data.chunk?.choices?.[0]?.delta?.content;
                  if (content) accumulatedContent += content;
                  onChunk(data.chunk);
                } else if (data.type === 'done') {
                  clearInterval(stallCheckInterval);
                  onComplete();
                  return;
                } else if (data.type === 'error') {
                  clearInterval(stallCheckInterval);
                  throw new Error(data.error);
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
        clearInterval(stallCheckInterval);
        if (accumulatedContent.length > 0) {
          onComplete();
        } else {
          throw new Error('Stream ended without content');
        }
      } finally {
        clearInterval(stallCheckInterval);
        reader.releaseLock();
      }
    } catch (error) {
      clearTimeout(timeoutId);
      const err = error instanceof Error ? error : new Error('Streaming error');
      const isAbort = err.name === 'AbortError' || err.message.includes('aborted');
      const is429 = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit');
      const isRetryable = isAbort || is429 || err.message.includes('network') || err.message.includes('fetch') || err.message.includes('Stream ended without content');

      if (isRetryable && attempt < maxRetries) {
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return attemptStream();
      }

      onError(err);
    }
  };

  await attemptStream();
}
