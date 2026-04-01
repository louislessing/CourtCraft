'use client';

import { useState, useCallback } from 'react';
import { getChatCompletion, getStreamingChatCompletionWithProgress } from '@/lib/ai/chatCompletion';

export function useChat(provider: string, model: string, streaming: boolean = true) {
  const [response, setResponse] = useState('');
  const [fullResponse, setFullResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [retryInfo, setRetryInfo] = useState<{ attempt: number; maxRetries: number } | null>(null);

  const sendMessage = useCallback(
    async (messages: object[], parameters: object = {}) => {
      setResponse('');
      setFullResponse(streaming ? [] : null);
      setIsLoading(true);
      setError(null);
      setRetryInfo(null);

      try {
        if (streaming) {
          await getStreamingChatCompletionWithProgress(
            provider,
            model,
            messages,
            (chunk) => {
              setFullResponse((prev: any[]) => [...prev, chunk]);
              const content = chunk?.choices?.[0]?.delta?.content;
              if (content) setResponse((prev) => prev + content);
            },
            () => {
              setIsLoading(false);
              setRetryInfo(null);
            },
            (err) => {
              const is429 = err.message?.includes('429') || err.message?.toLowerCase().includes('rate limit');
              const friendlyError = is429
                ? new Error('The AI service is temporarily unavailable due to rate limits. Please wait a moment and try again.')
                : err;
              setError(friendlyError);
              setIsLoading(false);
              setRetryInfo(null);
            },
            (attempt, maxRetries) => {
              setRetryInfo({ attempt, maxRetries });
            },
            parameters,
            3
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
        setRetryInfo(null);
      }
    },
    [provider, model, streaming]
  );

  return { response, fullResponse, isLoading, error, retryInfo, sendMessage };
}
