import React, { useEffect, useMemo } from 'react';
import {
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Annotation } from '../types';
import NoteFlow from './note/NoteFlow';

import { useBookStore } from '@/store/book';
import { useAnnotationStore } from '@/store/annotation';
import { useConnectionStore } from '@/store/connection';


interface NotesViewProps {
  annotations: Annotation[];
  onCardClick: (annotation: Annotation) => void;
  isVisible: boolean;
  width?: number;
  bookId: string;
}
const defaultPosition = {
  x: 150,
  y: 150,
}
const NotesView: React.FC<NotesViewProps> = ({
  onCardClick,
  isVisible,
  width = 400,
  bookId,
}) => {
  const book = useBookStore(state => state.currBook)
  const annotations = useAnnotationStore(state => state.annotations);
  const cards = useAnnotationStore(state => state.cards);
  const loadConnectionsByBookId = useConnectionStore(state => state.loadConnectionsByBookId);
  const connections = useConnectionStore(state => state.connections);
  console.log('debug connections', connections);
  console.log('debug cards', cards);
  useEffect(() => {
    loadConnectionsByBookId(bookId);
  }, [bookId])

  const initialNodes = useMemo(() => {
    return cards.map(card => {
      const ann = annotations.find(item => item.id === card.annotationId)
      return {
        id: card.id,
        type: 'noteNode',
        position: card.position || defaultPosition,
        data: {
          annotation: ann,
          onCardClick,
        },
        style: {
          width: card?.width || 300,
          height: card?.height || 'auto',
        },
      }
    })
  }, [annotations, cards])
  const initialEdges = useMemo(() => {
    return connections.map(conn => ({
      id: conn.id,
      source: conn.fromCardId,
      target: conn.toCardId,
      type: 'noteEdge',
      data: {
        description: conn.description
      }
    }))
  }, [connections]);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 flex-shrink-0" style={{ width: `${width}px` }}>
      <div className="flex-1 w-full h-full">
        <ReactFlowProvider>
          <NoteFlow initialNodes={initialNodes} initialEdges={initialEdges} />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default NotesView;
