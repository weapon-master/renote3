import { getResponse } from "../utils/getResponse";

export default async function summaryTopic(content: string) {
    const sys = `You are very experienced reader, please read the content and summarize it into a topic. The topic a word or phrase`;
    const user = `Summarize the topic of the content below:
    ${content}
    `
    const msg = getResponse({sys, user});
    return msg;
}