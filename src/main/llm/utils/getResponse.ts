import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts"
import { getModel } from "./initDeepSeek"

interface Props {
    sys: string,
    user: string,
}
const model = getModel();

export const getResponse = async ({ sys, user }: Props) => {
    const promptTemplate = ChatPromptTemplate.fromMessages([
        ['system', sys],
        ['user', user],
    ])
    const chain = promptTemplate.pipe(model);
    const response = await chain.invoke({});
    console.log('llm response -----', response)
    return response.content;
}