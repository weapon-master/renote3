import { Book } from '../main/db/$schema';
import { create } from 'zustand';

type NewBook = Omit<Book, 'id'>;

type BookStore = {
  books: Book[];
  loading: boolean;
  currBook: Book | null;
  pendingSelection: {
    id?: string;
    cfiRange: string;
    text: string;
  } | null;
  spineSelectorModalOpen: boolean;
  explanationModalOpen: boolean;
  selectBook: (bookId: string) => void;
  loadBooks: () => Promise<void>;
  createBook: (book: NewBook) => Promise<void>;
  importBooks: (books: NewBook[]) => Promise<void>;
  updateBook: (bookId: string, update: Partial<NewBook>) => Promise<void>;
  updateReadingProgress: (
    bookId: string,
    readingProgress: string,
  ) => Promise<void>;
  deleteBook: (bookId: string) => Promise<void>;
  openSpineSelectorModal: () => void;
  closeSpineSelectorModal: () => void;
  setPendingSelection: (pendingSelection: {
    id?: string;
    cfiRange: string;
    text: string;
  } | null) => void;
  openExplanationModal: () => void;
  closeExplanationModal: () => void;
};

export const useBookStore = create<BookStore>((set, get) => ({
  books: [],
  currBook: null,
  loading: true,
  pendingSelection: null,
  spineSelectorModalOpen: false,
  explanationModalOpen: false,
  selectBook: (bookId: string) => {
    const currBookId = bookId;
    set({
      currBook: get().books.find((item) => item.id === currBookId) ?? null,
    });
  },
  loadBooks: async () => {
    set(() => ({ loading: true }));
    const books = await window.electron.db.getAllBooks();
    set(() => ({ books, loading: false }));
  },
  createBook: async (book: NewBook) => {
    await window.electron.db.createBook(book);
    await get().loadBooks();
  },
  importBooks: async (importedBooks: Book[]) => {
    const { books: prevBooks } = get();
    const existingFilePaths = new Set(prevBooks.map((book) => book.filePath));
    const newBooks = importedBooks.filter(
      (book) => !existingFilePaths.has(book.filePath),
    );
    if (newBooks.length <= 0) {
      console.log('No new books to add');
      return;
    }
    set((state) => ({ books: [...state.books, ...newBooks] }));
    console.log(`Adding ${newBooks.length} new books to shelf`);
  },
  updateBook: async (bookId: string, update: Partial<NewBook>) => {
    const { success, error } = await window.electron.db.updateBook(
      bookId,
      update,
    );
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      books: state.books.map((item) =>
        item.id === bookId ? { ...item, ...update } : item,
      ),
    }));
  },
  updateReadingProgress: async (bookId: string, readingProgress: string) => {
    const { success, error } = await window.electron.db.updateReadingProgress(
      bookId,
      readingProgress,
    );
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      books: state.books.map((item) =>
        item.id === bookId ? { ...item, readingProgress } : item,
      ),
    }));
  },
  deleteBook: async (bookId: string) => {
    const { success, error } = await window.electron.db.deleteBook(bookId);
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      books: state.books.filter((item) => item.id !== bookId),
    }));
  },
  setPendingSelection: (pendingSelection: {
    id?: string;
    cfiRange: string;
    text: string;
  } | null) => {
    set(() => ({ pendingSelection }));
  },
  openSpineSelectorModal: () => {
    set(() => ({ spineSelectorModalOpen: true }));
  },
  closeSpineSelectorModal: () => {
    set(() => ({ spineSelectorModalOpen: false }));
  },
  openExplanationModal: () => {
    set(() => ({ explanationModalOpen: true }));
  },
  closeExplanationModal: () => {
    set(() => ({ explanationModalOpen: false }));
  },
}));
