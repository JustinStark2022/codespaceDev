import fetch from 'node-fetch';
import logger from './logger';

const RUNPOD_API_URL = 'https://api.runpod.ai/v2/k3lpgrhqnz3ng4/run';
const API_KEY = process.env.RUNPOD_API_KEY!;

export async function callLLM(prompt: string): Promise<string> {
  try {
    const body = {
      input: {
        prompt,
        max_length: 1000,
        temperature: 0.7,
        top_p: 0.9,
      },
    };

    logger.info('Calling RunPod LLM endpoint', { promptLength: prompt.length });

    const response = await fetch(RUNPOD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(`RunPod API error: ${response.status} - ${errorText}`);
      throw new Error(`RunPod error: ${response.status} - ${errorText}`);
    }

    const data = await response.json() as {
      output?: string;
      choices?: { text?: string }[];
      generated_text?: string;
    };
    logger.info('RunPod LLM response received');
    
    return data.output || data.choices?.[0]?.text || data.generated_text || 'No response generated';
  } catch (error: any) {
    logger.error('Error calling RunPod LLM', { error: error.message });
    throw new Error(`LLM call failed: ${error.message}`);
  }
}

export async function callLLMWithRetry(prompt: string, maxRetries: number = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM(prompt);
    } catch (error: any) {
      logger.warn(`LLM call attempt ${attempt} failed`, { error: error.message });
      if (attempt === maxRetries) {
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  throw new Error('All LLM retry attempts failed');
}
