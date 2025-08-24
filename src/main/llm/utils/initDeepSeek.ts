import * as dotenv from 'dotenv';
import { ChatDeepSeek } from '@langchain/deepseek';
dotenv.config();

let model: ChatDeepSeek | null;

export const getModel = () => {
  if (model) {
    return model;
  }
  model = new ChatDeepSeek({
    modelName: 'deepseek-ai/DeepSeek-V3',
    temperature: 0.9,
    configuration: {
      baseURL: 'https://api.siliconflow.cn/v1',
    },
  });
  return model;
};
