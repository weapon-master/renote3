import { getResponse } from "../utils/getResponse";

export default async function summarizeBook(content: string) {
    const sys = `你非常擅长阅读，请阅读下面的内容，并总结出这本书探讨的主题，主题需要简洁明了，不要超过50个字`;
    const user = `以下是本书的序言，请总结本书的主题：
    ${content}
    `
    const msg = await getResponse({sys, user});
    return msg;
}