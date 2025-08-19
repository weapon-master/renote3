import { Card } from '@/main/db/$schema';
import { create } from 'zustand';

type NewCard = Omit<Card, 'id'>;

type CardStore = {
  cards: Card[];
  annotationIds: string[];
  loadCardsByAnnotationIds: (annotationIds: string[]) => Promise<void>;
  createCard: (card: NewCard) => Promise<void>;
  updateCard: (id: string, update: Partial<NewCard>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
};

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],
  annotationIds: [],
  loadCardsByAnnotationIds: async (annotationIds: string[]) => {
    const cards =
      await window.electron.db.getCardsByAnnotationIds(annotationIds);
    set(() => ({ cards, annotationIds }));
  },
  createCard: async (card) => {
    await window.electron.db.createCard(card.annotationId, card);
    const { annotationIds } = get();
    await get().loadCardsByAnnotationIds([...annotationIds, card.annotationId]);
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
  deleteCard: async (id: string) => {
    const { success, error } = await window.electron.db.deleteCards([id]);
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      cards: state.cards.filter((item) => item.id !== id),
    }));
  },
}));
