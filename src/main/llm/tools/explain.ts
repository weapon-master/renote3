import { getResponse } from "../utils/getResponse";

export default async function explain(topic: string, content: string) {
    const sys = `你是${topic}方面的专家，请用浅显易懂的语言解释下面书中的内容：`;
    const user = `你需要解释的内容是：
    ${content}
    `
    const msg = await getResponse({sys, user});
    return msg;
}