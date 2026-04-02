'use client';

import { useState, useCallback } from 'react';
import { generateImage } from '@/lib/ai/imageGeneration';

export function useImageGeneration(provider: string, model: string) {
  const [image, setImage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const generate = useCallback(
    async (prompt: string, parameters: object = {}) => {
      setImage(null);
      setIsLoading(true);
      setError(null);

      try {
        const result = await generateImage(provider, model, prompt, parameters);
        setImage(result);
        return result;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    },
    [provider, model]
  );

  return { image, isLoading, error, generate };
}
