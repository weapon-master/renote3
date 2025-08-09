declare module 'epub2' {
  interface EpubMetadata {
    title?: string;
    creator?: string;
    subject?: string;
    description?: string;
    publisher?: string;
    contributor?: string;
    date?: string;
    type?: string;
    format?: string;
    identifier?: string;
    source?: string;
    language?: string;
    relation?: string;
    coverage?: string;
    rights?: string;
  }

  interface EpubFlow {
    id: string;
    href: string;
    title?: string;
  }

  interface EpubToc {
    id: string;
    href: string;
    title?: string;
  }

  interface EpubSpine {
    id: string;
    href?: string;
  }

  interface EpubManifestItem {
    id: string;
    href: string;
    'media-type'?: string;
  }

  class EPub {
    metadata: EpubMetadata;
    flow: EpubFlow[];
    toc: EpubToc[];
    spine: EpubSpine[];
    manifest: { [key: string]: EpubManifestItem };
    
    constructor(epubfile: string, imagewebroot?: string, chapterwebroot?: string);
    
    static createAsync(epubfile: string, imagewebroot?: string, chapterwebroot?: string): Promise<EPub>;
    
    parse(): void;
    getChapter(chapterId: string, callback: (error: Error | null, text: string) => void): void;
    getChapterRaw(chapterId: string, callback: (error: Error | null, text: string) => void): void;
    getImage(imageId: string, callback: (error: Error | null, img: Buffer, mimeType: string) => void): void;
    getFile(fileId: string, callback: (error: Error | null, data: Buffer, mimeType: string) => void): void;
  }

  export = EPub;
}

declare module 'pdf-parse' {
  interface PdfData {
    text: string;
    numpages: number;
    info: {
      Title?: string;
      Author?: string;
      Subject?: string;
      Keywords?: string;
      Creator?: string;
      Producer?: string;
      CreationDate?: string;
      ModDate?: string;
    };
  }

  function pdfParse(dataBuffer: Buffer): Promise<PdfData>;
  export = pdfParse;
}

