import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Node,
  Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Annotation, NoteConnection } from '../types';
import NoteFlow from './note/NoteFlow';
import { debounce } from 'lodash-es';
import './NotesView.css';


// Custom Node Component

const saveConnections = debounce(async (newEdges: Edge[], bookId: string) => {
  try {
    const electron = (window as any).electron;
    if (electron && electron.db) {
      const dbConnections: NoteConnection[] = newEdges.map(edge => ({
        id: edge.id,
        bookId,
        fromCardId: edge.source.replace('card-', ''),
        toCardId: edge.target.replace('card-', ''),
        description: edge.data?.description as string | undefined,
      }));
      
      await electron.db.batchUpdateNoteConnections(bookId, dbConnections);
    }
  } catch (error) {
    console.warn('Failed to save connections to database:', error);
  }
}, 1000);

const saveAnnotations = debounce(async (newNodes: Node<{ annotation: Annotation }>[], bookId: string) => {
  console.log('saveAnnotations called with:', { newNodes, bookId });
  try {
    const electron = (window as any).electron;
    if (electron && electron.db) {
      // 获取所有注释ID
      const annotationIds = newNodes.map(node => node.id.replace('card-', ''));
      console.log('Annotation IDs to update:', annotationIds);
      
      // 获取现有的卡片
      const existingCards = await electron.db.getCardsByAnnotationIds(annotationIds);
      console.log('Existing cards from database:', existingCards);
      const existingCardsMap = new Map(existingCards.map((card: any) => [card.annotationId, card]));
      
      // 准备要更新的卡片数据
      const cardsToUpdate = newNodes.map(node => {
        const annotationId = node.id.replace('card-', '');
        const existingCard = existingCardsMap.get(annotationId);
        
        const cardData = {
          id: (existingCard as any)?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          annotationId,
          position: node.position,
          width: node.style.width as number,
          height: node.style.height as number,
        };
        console.log('Card data to update:', cardData);
        return cardData;
      });
      
      console.log('Saving cards to database:', cardsToUpdate);
      // 批量更新卡片
      const result = await electron.db.batchUpdateCards(cardsToUpdate);
      console.log('Database update result:', result);
    } else {
      console.warn('electron.db is not defined');
    }
  } catch (error) {
    console.error('Failed to save annotations to database:', error);
  }
}, 1000);

interface NotesViewProps {
  annotations: Annotation[];
  onCardClick: (annotation: Annotation) => void;
  isVisible: boolean;
  width?: number;
  bookId: string;
}

const NotesView: React.FC<NotesViewProps> = ({ 
  annotations, 
  onCardClick, 
  isVisible, 
  width = 400, 
  bookId 
}) => {
  const [initialNodes, setInitialNodes] = useState<Node[]>([]);
  const [initialEdges, setInitialEdges] = useState<Edge[]>([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Load connections from database
  const loadConnections = useCallback(async () => {
    try {
      setIsLoadingConnections(true);
      const electron = (window as any).electron;
      if (electron && electron.db) {
        const dbConnections = await electron.db.getNoteConnectionsByBookId(bookId);
        
        const reactFlowEdges: Edge[] = dbConnections.map((dbConn: NoteConnection) => ({
          id: dbConn.id,
          source: `card-${dbConn.fromCardId}`,
          target: `card-${dbConn.toCardId}`,
          type: 'noteEdge',
          data: {
            description: dbConn.description,
          },
        }));
        console.log('reactFlowEdges', reactFlowEdges);
        setInitialEdges(reactFlowEdges);
      }
    } catch (error) {
      console.warn('Failed to load connections from database:', error);
    } finally {
      setIsLoadingConnections(false);
      setHasInitialized(true);
    }
  }, [bookId]);

  // Save connections to database


  // Load cards from database and initialize nodes
  const loadCardsAndInitializeNodes = useCallback(async () => {
    try {
      const electron = (window as any).electron;
      if (electron && electron.db && annotations.length > 0) {
        // 获取所有注释ID
        const annotationIds = annotations.map(ann => ann.id);
        
        // 从数据库加载卡片数据
        const existingCards = await electron.db.getCardsByAnnotationIds(annotationIds);
        const cardsMap = new Map(existingCards.map((card: any) => [card.annotationId, card]));
        
        // 创建节点，使用保存的位置或默认位置
        const newNodes: Node[] = annotations.map((annotation, index) => {
          const savedCard = cardsMap.get(annotation.id) as any;
          const defaultPosition = { x: 50 + index * 200, y: 50 + index * 150 };
          
          return {
            id: `card-${annotation.id}`,
            type: 'noteNode',
            position: savedCard?.position || defaultPosition,
            data: {
              annotation,
              onCardClick,
            },
            style: {
              width: savedCard?.width || 200,
              height: savedCard?.height || 120,
            },
          };
        });
        
        setInitialNodes(newNodes);
      } else {
        // 如果没有数据库或注释为空，使用默认位置
        const newNodes: Node[] = annotations.map((annotation, index) => ({
          id: `card-${annotation.id}`,
          type: 'noteNode',
          position: { x: 50 + index * 200, y: 50 + index * 150 },
          data: {
            annotation,
            onCardClick,
          },
          style: {
            width: 200,
            height: 120,
          },
        }));
        setInitialNodes(newNodes);
      }
    } catch (error) {
      console.warn('Failed to load cards from database:', error);
      // 出错时使用默认位置
      const newNodes: Node[] = annotations.map((annotation, index) => ({
        id: `card-${annotation.id}`,
        type: 'noteNode',
        position: { x: 50 + index * 200, y: 50 + index * 150 },
        data: {
          annotation,
          onCardClick,
        },
        style: {
          width: 200,
          height: 120,
        },
      }));
      setInitialNodes(newNodes);
    }
  }, [annotations, onCardClick]);

  // Initialize nodes when annotations change
  useEffect(() => {
    loadCardsAndInitializeNodes();
  }, [loadCardsAndInitializeNodes]);
  
  // 当注释列表更新时，确保连接仍然有效
  useEffect(() => {
    if (hasInitialized && initialEdges.length > 0) {
      // 过滤掉指向不存在注释的连接
      const validEdges = initialEdges.filter(edge => {
        const sourceExists = annotations.some(ann => `card-${ann.id}` === edge.source);
        const targetExists = annotations.some(ann => `card-${ann.id}` === edge.target);
        return sourceExists && targetExists;
      });
      
      if (validEdges.length !== initialEdges.length) {
        setInitialEdges(validEdges);
      }
    }
  }, [annotations, initialEdges, hasInitialized]);

  // Load connections from database
  useEffect(() => {
    if (annotations.length > 0) {
      setHasInitialized(false);
      loadConnections();
    }
  }, [bookId, loadConnections]); // 移除annotations依赖，避免重复加载

  const onNodesUpdate = useCallback((nodes: Node<{ annotation: Annotation }>[]) => {
    console.log('onNodesUpdate', nodes);
    saveAnnotations(nodes, bookId);
  }, [bookId]);
  const onEdgesUpdate = useCallback((edges: Edge[]) => {
    console.log('onEdgesUpdate', edges);
    saveConnections(edges, bookId);
  }, [bookId]);

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
      
      {hasInitialized && <NoteFlow initialNodes={initialNodes} initialEdges={initialEdges} onNodesUpdate={onNodesUpdate} onEdgesUpdate={onEdgesUpdate} />}
    </div>
  );
};

export default NotesView;
