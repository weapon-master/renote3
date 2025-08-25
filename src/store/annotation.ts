import { Annotation, Card } from '@/main/db/$schema';
import { create } from 'zustand';

type NewAnnotation = Omit<Annotation, 'id'>;
type NewCard = Omit<Card, 'id'>;
type Position = {
  x: number,
  y: number,
}
type AnnotationStore = {
  annotations: Annotation[];
  loadAnnotationsByBook: (bookId: string) => Promise<void>;
  createAnnotation: (
    bookId: string,
    annotation: NewAnnotation,
  ) => Promise<Annotation>;
  updateAnnotation: (
    id: string,
    update: Partial<NewAnnotation>,
  ) => Promise<void>;
  deleteAnnotation: (id: string) => void;
  cards: Card[];
  updateCard: (id: string, update: Partial<NewCard>) => Promise<void>;
  canvasCenterPosition: { x: number, y: number };
  updateCanvasCenterPosition: (position: Position) => void;
};

export const useAnnotationStore = create<AnnotationStore>((set, get) => ({
  annotations: [],
  cards: [],
  loadAnnotationsByBook: async (bookId: string) => {
    const annotations = await window.electron.db.getAnnotationsByBookId(bookId);
    const cards = await window.electron.db.getCardsByAnnotationIds(annotations.map(({ id }) => id));
    set(() => ({ annotations, cards }));
  },
  createAnnotation: async (bookId: string, annotation: NewAnnotation) => {
    const result = await window.electron.db.createAnnotation(bookId, annotation);
    const canvasCenterPosition = get().canvasCenterPosition;
    const defaultCard = {
      annotationId: result.id,
      position: canvasCenterPosition,
      width: 300,
      // height: 'auto',
    }
    await window.electron.db.createCard(result.id, defaultCard);
    await get().loadAnnotationsByBook(bookId);
    return result;
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
      cards: state.cards.filter(item => item.annotationId !== id)
    }));
  },
  updateCard: async (id: string, update: Partial<NewCard>) => {
    const { success, error } = await window.electron.db.updateCard(id, update);
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      cards: state.cards.map((item) =>
        item.id === id ? { ...item, ...update } : item,
      ),
    }));
  },
  canvasCenterPosition: { x: 50, y: 200 },
  updateCanvasCenterPosition: (position: Position) => {
    set(() => ({ canvasCenterPosition: position }));
  }
}));
