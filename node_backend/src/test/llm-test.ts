import { llmService } from '../services/llm.service';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.node_backend') });

async function testLLMConnection() {
  console.log('🚀 Testing LLM Connection...\n');
  
  // Check environment variables
  console.log('📋 Environment Check:');
  console.log(`   RUNPOD_API_KEY: ${process.env.RUNPOD_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   RUNPOD_ENDPOINT_ID: ${process.env.RUNPOD_ENDPOINT_ID || 'Using default'}\n`);

  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic LLM Response');
    const basicTest = await llmService.generateResponse({
      prompt: "Say 'Hello from Faith Fortress AI!' if you can respond correctly.",
      maxTokens: 50,
      temperature: 0.3,
    });
    console.log('✅ Basic Response:', basicTest.text);
    console.log('📊 Tokens used:', basicTest.usage?.total_tokens || 'Unknown');
    console.log('');

    // Test 2: Verse of the Day
    console.log('Test 2: Verse of the Day Generation');
    const verse = await llmService.generateVerseOfTheDay();
    console.log('✅ Generated Verse:');
    console.log(`   📖 Verse: ${verse.verse}`);
    console.log(`   📍 Reference: ${verse.reference}`);
    console.log(`   💭 Reflection: ${verse.reflection}`);
    console.log('');

    // Test 3: Devotional
    console.log('Test 3: Devotional Generation');
    const devotional = await llmService.generateDevotional('family love');
    console.log('✅ Generated Devotional:');
    console.log(`   📝 Title: ${devotional.title}`);
    console.log(`   📄 Content: ${devotional.content.substring(0, 100)}...`);
    console.log(`   🙏 Prayer: ${devotional.prayer}`);
    console.log('');

    // Test 4: Chat Response
    console.log('Test 4: Chat Response');
    const chatResponse = await llmService.generateChatResponse(
      "How can I help my child develop better screen time habits?",
      "parental_guidance"
    );
    console.log('✅ Chat Response:', chatResponse.substring(0, 150) + '...');
    console.log('');

    console.log('🎉 All LLM tests completed successfully!');
    return true;

  } catch (error: any) {
    console.error('❌ LLM Test Failed:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testLLMConnection()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      console.log(success ? '✅ ALL TESTS PASSED' : '❌ TESTS FAILED');
      console.log('='.repeat(50));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testLLMConnection };
