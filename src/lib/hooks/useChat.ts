'use client';

import { useState, useCallback } from 'react';
import { getChatCompletion, getStreamingChatCompletion } from '@/lib/ai/chatCompletion';

// Duplicate of useChat.tsx — kept to satisfy any .ts imports.
// Both files contain identical logic with rate-limit friendly error handling.
export function useChat(provider: string, model: string, streaming: boolean = true) {
  const [response, setResponse] = useState('');
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (messages: object[], parameters: object = {}) => {
      setResponse('');
      setFullResponse(streaming ? [] : null);
      setIsLoading(true);
      setError(null);

      try {
        if (streaming) {
          await getStreamingChatCompletion(
            provider,
            model,
            messages,
            (chunk) => {
              setFullResponse((prev: any[]) => [...prev, chunk]);
              const content = chunk?.choices?.[0]?.delta?.content;
              if (content) setResponse((prev) => prev + content);
            },
            () => setIsLoading(false),
            (err) => {
              const is429 = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit');
              const friendlyError = is429
                ? new Error('The AI service is temporarily unavailable due to rate limits. Please wait a moment and try again.')
                : err;
              setError(friendlyError);
              setIsLoading(false);
            },
            parameters
          );
        } else {
          const result = await getChatCompletion(provider, model, messages, parameters);
          setFullResponse(result);
          setResponse(result?.choices?.[0]?.message?.content || '');
          setIsLoading(false);
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        const is429 = error.message?.includes('429') || error.message?.toLowerCase().includes('rate limit');
        const friendlyError = is429
          ? new Error('The AI service is temporarily unavailable due to rate limits. Please wait a moment and try again.')
          : error;
        setError(friendlyError);
        setIsLoading(false);
      }
    },
    [provider, model, streaming]
  );

  return { response, fullResponse, isLoading, error, sendMessage };
}
