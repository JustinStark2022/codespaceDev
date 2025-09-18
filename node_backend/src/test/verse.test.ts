import { LlmService } from '../services/llm.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.node_backend') });

describe('Verse of the Day', () => {
  it('should return different verses on multiple calls', async () => {
    const llmService = new LlmService();
    const verse1 = await llmService.generateVerseOfTheDay();
    const verse2 = await llmService.generateVerseOfTheDay();
    const verse3 = await llmService.generateVerseOfTheDay();

    const verses = [verse1.verse, verse2.verse, verse3.verse];
    const uniqueVerses = new Set(verses);

    expect(uniqueVerses.size).toBeGreaterThan(1);
  }, 120000);
});
