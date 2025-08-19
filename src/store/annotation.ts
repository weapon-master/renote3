import { Annotation } from '@/main/db/$schema';
import { create } from 'zustand';

type NewAnnotation = Omit<Annotation, 'id'>;

type AnnotationStore = {
  annotations: Annotation[];
  loadAnnotationsByBook: (bookId: string) => Promise<void>;
  createAnnotation: (
    bookId: string,
    annotation: NewAnnotation,
  ) => Promise<void>;
  updateAnnotation: (
    id: string,
    update: Partial<NewAnnotation>,
  ) => Promise<void>;
  deleteAnnotation: (id: string) => void;
};

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: [],
  loadAnnotationsByBook: async (bookId: string) => {
    const annotations = await window.electron.db.getAnnotationsByBookId(bookId);
    set(() => ({ annotations }));
  },
  createAnnotation: async (bookId: string, annotation: NewAnnotation) => {
    await window.electron.db.createAnnotation(bookId, annotation);
    await get().loadAnnotationsByBook(bookId);
  },
  updateAnnotation: async (id: string, update: Partial<NewAnnotation>) => {
    const { success, error } = await window.electron.db.updateAnnotation(id, update);
    if (!success) {
        console.error(error);
        return;
    }

    set((state) => ({
      annotations: state.annotations.map((item) =>
        item.id === id ? { ...item, ...update } : item,
      ),
    }));
  },
  deleteAnnotation: async (id: string) => {
    const { success, error } = await window.electron.db.deleteAnnotation(id);
    if (!success) {
        console.error(error);
        return;
    }
    set((state) => ({
      annotations: state.annotations.filter((item) => item.id !== id),
    }));
  },
}));
