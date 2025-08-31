import { create } from 'zustand';

type NoteViewStore = {
    showNotesView: boolean;
    toggleNotesView: () => void;
}

export const useNoteViewStore = create<NoteViewStore>((set) => ({
    showNotesView: false,
    toggleNotesView: () => set((state) => ({ showNotesView: !state.showNotesView })),
}))