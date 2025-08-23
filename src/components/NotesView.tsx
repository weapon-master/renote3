import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Node,
  Edge,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Annotation, NoteConnection } from '../types';
import NoteFlow from './note/NoteFlow';
import { debounce } from 'lodash-es';
import './NotesView.css';
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
  // annotations, 
  onCardClick,
  isVisible,
  width = 400,
}) => {
  const book = useBookStore(state => state.currBook)
  const bookId = book.id
  const annotations = useAnnotationStore(state => state.annotations);
  const cards = useAnnotationStore(state => state.cards);
  const loadConnectionsByBookId = useConnectionStore(state => state.loadConnectionsByBookId);
  const connections = useConnectionStore(state => state.connections);
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
          width: card?.width || 200,
          height: card?.height || 120,
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
    <div className="notes-view" style={{ width: `${width}px` }}>
      <div className="notes-header">
        <h3>Notes View</h3>
      </div>

      <div className="notes-instructions">
        <p>💡 <strong>Instructions:</strong></p>
        <ul>
          <li>Click cards to navigate to notes in the reader</li>
          <li>Drag cards to reposition them</li>
          <li><strong>Ctrl + click and drag</strong> from one card to another to connect them</li>
          <li>Click connections to edit direction and description</li>
          <li>Use mouse wheel to zoom, drag to pan</li>
        </ul>
      </div>

      <ReactFlowProvider><NoteFlow initialNodes={initialNodes} initialEdges={initialEdges} /></ReactFlowProvider>
    </div>
  );
};

export default NotesView;
