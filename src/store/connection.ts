import { NoteConnection as Connection } from '@/main/db/$schema';
import { create } from 'zustand';

type NewConnection = Omit<Connection, 'id'>;

type ConnectionStore = {
  connections: Connection[];
  bookId: string;
  loadConnectionsByBookId: (bookId: string) => Promise<void>;
  createConnection: (connection: NewConnection) => Promise<void>;
  batchCreateConnections: (
    bookId: string,
    connections: Connection[],
  ) => Promise<void>;
  updateConnection: (
    id: string,
    connection: Partial<NewConnection>,
  ) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
};

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: [],
  bookId: '',
  loadConnectionsByBookId: async (bookId: string) => {
    const connections =
      await window.electron.db.getNoteConnectionsByBookId(bookId);
    set(() => ({ connections, bookId }));
  },
  createConnection: async (connection: NewConnection) => {
    const newConn = await window.electron.db.createNoteConnection(connection);
    set((state) => ({ connections: [...state.connections, newConn] }));
    // loadConnectionsByBookId(bookId);
  },
  batchCreateConnections: async (bookId: string, connections: Connection[]) => {
    const { success, error } =
      await window.electron.db.batchUpdateNoteConnections(bookId, connections);
    if (!success) {
      console.error({
        success,
        error,
        bookId,
        connections,
      });
      return;
    }
    set((state) => ({ connections: [...state.connections, ...connections] }));
  },
  updateConnection: async (id: string, connection: Partial<NewConnection>) => {
    const { success, error } = await window.electron.db.updateNoteConnection(
      id,
      connection,
    );
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      connections: state.connections.map((item) =>
        item.id === id ? { ...item, ...connection } : item,
      ),
    }));
  },
  deleteConnection: async (id: string) => {
    const { success, error } =
      await window.electron.db.deleteNoteConnection(id);
    if (!success) {
      console.error(error);
      return;
    }
    set((state) => ({
      connections: state.connections.filter((item) => item.id !== id),
    }));
  },
}));
