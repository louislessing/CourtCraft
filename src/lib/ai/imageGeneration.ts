import { callAIEndpoint } from './aiClient';

const ENDPOINT = '/api/ai/image-generation';

export async function generateImage(
  provider: string,
  model: string,
  prompt: string,
  parameters: object = {}
) {
  return callAIEndpoint(ENDPOINT, { provider, model, prompt, parameters });
}
