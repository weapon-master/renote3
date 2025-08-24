// index.ts

// 1. Configure environment variables
import * as dotenv from 'dotenv';
dotenv.config();

// 2. Import the DeepSeek model and ChatPromptTemplate
import { ChatDeepSeek } from '@langchain/deepseek';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// 3. Initialize the DeepSeek Chat Model with clientOptions
const model = new ChatDeepSeek({
  modelName: 'deepseek-ai/DeepSeek-V3',
  temperature: 0.9,
  // highlight-start
  configuration: {
    baseURL: 'https://api.siliconflow.cn/v1', // <-- Correctly nested here
  },

  // highlight-end
});

// 4. Create a Prompt Template
const promptTemplate = ChatPromptTemplate.fromMessages([
  ['system', 'You are a world-class creative story writer.'],
  ['user', 'Write a short, 50-word story about a {topic}.'],
]);

// 5. Create the Chain
const chain = promptTemplate.pipe(model);

// 6. Define an async function to run the chain
async function generateStory(topic: string) {
  console.log(`Generating a story about: ${topic}`);

  const response = await chain.invoke({ topic: topic });

  console.log('\n--- Story ---');
  console.log(response.content);
  console.log('-------------');
}

// 7. Run the function
generateStory('a spaceship finding a floating library in deep space');
