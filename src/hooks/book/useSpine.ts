import { RefObject } from 'react';
import { Book as EpubBook, NavItem } from 'epubjs';

export class NormSpineItem {
    id: string;
    href: string;
    title: string;
    spineIndex: number;
    children: NormSpineItem[];
    rawSpine: EpubBook['spine'];
    book: EpubBook;

    constructor(tocItem: NavItem, book: EpubBook) {
        this.rawSpine = book.spine;
        this.book = book;
        this.id = tocItem.id;
        this.href = tocItem.href;
        this.title = tocItem.label.trim();
        //@ts-ignore
        this.spineIndex = book.spine.items.findIndex(s => s.href === tocItem.href);
        this.children = tocItem.subitems?.length > 0 ? tocItem.subitems?.map(subItem => new NormSpineItem(subItem, book)) : [];
    }

    async loadTextContent(): Promise<{text: string, html: string}> {
        const spineSection = this.rawSpine.get(this.spineIndex);
        const doc = await spineSection.load(this.book.load.bind(this.book));
        // @ts-ignore
        const text = doc.innerText;
        // @ts-ignore
        const html = doc.innerHTML;
        return { text: text.trim(), html: html.trim() };
    }
}

const useSpine = (bookRef: RefObject<EpubBook>) => {
  if (!bookRef.current) return [];
  const toc = bookRef.current.navigation?.toc;
  const spines = toc?.map(tocItem => new NormSpineItem(tocItem, bookRef.current));
  return spines;
};

export default useSpine;
