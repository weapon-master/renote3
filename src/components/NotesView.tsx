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
      // 获取所有节点以建立卡片ID到注释ID的映射
      const allNodes = await electron.db.getCardsByAnnotationIds([]);
      const cardToAnnotationMap = new Map(allNodes.map((card: any) => [card.id, card.annotationId]));
      
      const dbConnections: NoteConnection[] = newEdges.map(edge => {
        const fromCardId = edge.source.replace('card-', '');
        const toCardId = edge.target.replace('card-', '');
        
        // 将卡片ID转换为注释ID
        const fromAnnotationId = (cardToAnnotationMap.get(fromCardId) as string) || fromCardId;
        const toAnnotationId = (cardToAnnotationMap.get(toCardId) as string) || toCardId;
        
        return {
          id: edge.id,
          bookId,
          fromCardId: fromAnnotationId, // 这里实际上是注释ID
          toCardId: toAnnotationId,     // 这里实际上是注释ID
          description: edge.data?.description as string | undefined,
        };
      });
      
      await electron.db.batchUpdateNoteConnections(bookId, dbConnections);
    }
  } catch (error) {
    console.warn('Failed to save connections to database:', error);
  }
}, 1000);

// 立即保存函数，不使用 debounce
const saveAnnotationsImmediate = async (newNodes: Node<{ annotation: Annotation }>[], bookId: string, retryCount = 0) => {
  console.log('saveAnnotationsImmediate called with:', { newNodes, bookId, retryCount });
  try {
    const electron = (window as any).electron;
    if (electron && electron.db) {
             // 获取所有注释ID和卡片ID
       const nodeInfo = newNodes.map(node => {
         const nodeId = node.id.replace('card-', '');
         // 检查是否是数据库中的卡片ID（包含时间戳格式）
         const isCardId = /^\d+_[a-z0-9]+$/.test(nodeId);
         if (isCardId) {
           // 这是数据库中的卡片ID，需要从节点数据中获取注释ID
           return {
             cardId: nodeId,
             annotationId: node.data.annotation.id,
             node
           };
         } else {
           // 这是注释ID
           return {
             cardId: null,
             annotationId: nodeId,
             node
           };
         }
       });
       
       const annotationIds = nodeInfo.map(info => info.annotationId);
       const cardIds = nodeInfo.filter(info => info.cardId).map(info => info.cardId);
       console.log('Annotation IDs to update:', annotationIds);
       console.log('Card IDs found:', cardIds);
      
      // 验证所有注释都存在，过滤掉不存在的注释
      const existingAnnotations = await electron.db.getAnnotationsByBookId(bookId);
      const existingAnnotationIds = new Set(existingAnnotations.map((ann: any) => ann.id));
      const missingAnnotations = annotationIds.filter(id => !existingAnnotationIds.has(id));
      
      if (missingAnnotations.length > 0) {
        console.warn('Some annotations are missing from database:', missingAnnotations);
        
        // 如果是重试，等待一段时间后再试
        if (retryCount < 3) {
          console.log(`Retrying in 500ms (attempt ${retryCount + 1}/3)...`);
          setTimeout(() => {
            saveAnnotationsImmediate(newNodes, bookId, retryCount + 1);
          }, 500);
          return;
        }
        
                 // 过滤掉不存在的注释，只保存有效的卡片
         const validNodes = nodeInfo.filter(info => existingAnnotationIds.has(info.annotationId)).map(info => info.node);
        
        if (validNodes.length === 0) {
          console.warn('No valid annotations to save cards for');
          return;
        }
        
        // 使用有效的节点继续处理
        newNodes = validNodes;
        console.log('Filtered to valid nodes:', validNodes.length);
      }
      
      // 获取现有的卡片
      const existingCards = await electron.db.getCardsByAnnotationIds(annotationIds);
      console.log('Existing cards from database:', existingCards);
      const existingCardsMap = new Map(existingCards.map((card: any) => [card.annotationId, card]));
      
             // 准备要更新的卡片数据
       const cardsToUpdate = nodeInfo.map(info => {
         const existingCard = existingCardsMap.get(info.annotationId);
         
         const cardData = {
           id: info.cardId || (existingCard as any)?.id || `${Date.now()}_${Math.random().toString(36).slice(2)}`,
           annotationId: info.annotationId,
           position: info.node.position,
           width: info.node.style.width as number,
           height: info.node.style.height as number,
         };
         console.log('Card data to update:', cardData);
         return cardData;
       });
      
      console.log('Saving cards to database:', cardsToUpdate);
      // 批量更新卡片
      const result = await electron.db.batchUpdateCards(cardsToUpdate);
      console.log('Database update result:', result);
      
      if (!result.success) {
        console.error('Failed to update cards:', result.error);
        if (result.details) {
          console.error('Error details:', result.details);
        }
      } else {
        // 验证保存结果
        console.log('Verifying saved cards...');
        const savedCards = await electron.db.getCardsByAnnotationIds(annotationIds);
        console.log('Cards in database after save:', savedCards);
        
        // 检查是否有卡片没有被保存
        const savedAnnotationIds = new Set(savedCards.map((card: any) => card.annotationId));
        const missingCards = annotationIds.filter(id => !savedAnnotationIds.has(id));
        
        if (missingCards.length > 0) {
          console.warn('Some cards were not saved:', missingCards);
        } else {
          console.log('All cards were successfully saved');
        }
      }
    } else {
      console.warn('electron.db is not defined');
    }
  } catch (error) {
    console.error('Failed to save annotations to database:', error);
  }
};

// 使用较短的 debounce 延迟，提高响应性
const saveAnnotations = debounce(saveAnnotationsImmediate, 300);

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
    console.log('loadCardsAndInitializeNodes called with', annotations.length, 'annotations');
    try {
      const electron = (window as any).electron;
      if (electron && electron.db && annotations.length > 0) {
        // 获取所有注释ID
        const annotationIds = annotations.map(ann => ann.id);
        console.log('Loading cards for annotation IDs:', annotationIds);
        
        // 从数据库加载卡片数据
        const existingCards = await electron.db.getCardsByAnnotationIds(annotationIds);
        console.log('Loaded existing cards:', existingCards);
        const cardsMap = new Map(existingCards.map((card: any) => [card.annotationId, card]));
        
                 // 创建节点，使用保存的位置或默认位置
         const newNodes: Node[] = annotations.map((annotation, index) => {
           const savedCard = cardsMap.get(annotation.id) as any;
           const defaultPosition = { x: 50 + index * 200, y: 50 + index * 150 };
           
           // 使用数据库中的实际卡片ID，如果没有则使用临时ID
           const nodeId = (savedCard as any)?.id ? `card-${(savedCard as any).id}` : `card-${annotation.id}`;
           
           const node = {
             id: nodeId,
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
           
                        console.log('Created node for annotation', annotation.id, 'with card ID:', (savedCard as any)?.id, 'node ID:', node.id);
           return node;
         });
        
        console.log('Setting', newNodes.length, 'initial nodes');
        setInitialNodes(newNodes);
      } else {
        console.log('No database or no annotations, creating default nodes');
                 // 如果没有数据库或注释为空，使用默认位置
         const newNodes: Node[] = annotations.map((annotation, index) => ({
           id: `card-${annotation.id}`, // 使用注释ID作为临时节点ID
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
        console.log('Setting', newNodes.length, 'default nodes');
        setInitialNodes(newNodes);
      }
    } catch (error) {
      console.warn('Failed to load cards from database:', error);
             // 出错时使用默认位置
       const newNodes: Node[] = annotations.map((annotation, index) => ({
         id: `card-${annotation.id}`, // 使用注释ID作为临时节点ID
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
      console.log('Setting', newNodes.length, 'fallback nodes due to error');
      setInitialNodes(newNodes);
    }
  }, [onCardClick]); // 移除 annotations 依赖，避免循环

  // 添加新注释的节点到现有节点中
  const addNewAnnotationNodes = useCallback(async () => {
    try {
      const electron = (window as any).electron;
      if (electron && electron.db && annotations.length > 0) {
                 // 获取现有节点的注释ID
         const existingAnnotationIds = new Set(initialNodes.map(node => {
           const nodeId = node.id.replace('card-', '');
           // 检查是否是数据库中的卡片ID
           const isCardId = /^\d+_[a-z0-9]+$/.test(nodeId);
           if (isCardId) {
             // 这是数据库中的卡片ID，需要从节点数据中获取注释ID
             return node.data.annotation.id;
           } else {
             // 这是注释ID
             return nodeId;
           }
         }));
        console.log('Existing annotation IDs:', Array.from(existingAnnotationIds));
        
        // 找出新的注释
        const newAnnotations = annotations.filter(ann => !existingAnnotationIds.has(ann.id));
        console.log('New annotations found:', newAnnotations.map(a => a.id));
        
        if (newAnnotations.length > 0) {
          // 获取新注释的卡片数据
          const newAnnotationIds = newAnnotations.map(ann => ann.id);
          const existingCards = await electron.db.getCardsByAnnotationIds(newAnnotationIds);
          const cardsMap = new Map(existingCards.map((card: any) => [card.annotationId, card]));
          
                     // 创建新节点
           const newNodes: Node[] = newAnnotations.map((annotation, index) => {
             const savedCard = cardsMap.get(annotation.id) as any;
             const defaultPosition = { 
               x: 50 + (initialNodes.length + index) * 200, 
               y: 50 + (initialNodes.length + index) * 150 
             };
             
             // 使用数据库中的实际卡片ID，如果没有则使用临时ID
             const nodeId = (savedCard as any)?.id ? `card-${(savedCard as any).id}` : `card-${annotation.id}`;
             
             const node = {
               id: nodeId,
               type: 'noteNode',
               position: (savedCard as any)?.position || defaultPosition,
               data: {
                 annotation,
                 onCardClick,
               },
               style: {
                 width: (savedCard as any)?.width || 200,
                 height: (savedCard as any)?.height || 120,
               },
             };
             
             console.log('Created new node:', node.id, 'for annotation:', annotation.id, 'with card ID:', (savedCard as any)?.id);
             return node;
           });
          
          console.log('Adding', newNodes.length, 'new nodes to existing', initialNodes.length, 'nodes');
          // 添加新节点到现有节点中
          setInitialNodes(prevNodes => {
            const updatedNodes = [...prevNodes, ...newNodes];
            console.log('Updated nodes count:', updatedNodes.length);
            return updatedNodes;
          });
        } else {
          console.log('No new annotations to add');
        }
      } else {
        console.log('Electron or database not available');
      }
    } catch (error) {
      console.warn('Failed to add new annotation nodes:', error);
    }
  }, [annotations, initialNodes, onCardClick]);

  // Initialize nodes when annotations change
  useEffect(() => {
    console.log('Annotations changed:', { 
      annotationsLength: annotations.length, 
      nodesLength: initialNodes.length,
      annotationIds: annotations.map(a => a.id),
      nodeIds: initialNodes.map(n => n.id.replace('card-', ''))
    });
    
    // 简化逻辑：每当注释变化时，重新创建所有节点
    // 这样可以确保新注释能够正确创建卡片
    if (annotations.length > 0) {
      console.log('Recreating all nodes for', annotations.length, 'annotations');
      loadCardsAndInitializeNodes();
    } else {
      console.log('No annotations, clearing nodes');
      setInitialNodes([]);
    }
  }, [annotations]); // 移除 loadCardsAndInitializeNodes 依赖，避免循环
  
  // 当注释列表更新时，确保连接仍然有效
  useEffect(() => {
    if (hasInitialized && initialEdges.length > 0) {
             // 过滤掉指向不存在注释的连接
       const validEdges = initialEdges.filter(edge => {
         // 检查源和目标是否存在于当前节点中
         const sourceExists = initialNodes.some(node => node.id === edge.source);
         const targetExists = initialNodes.some(node => node.id === edge.target);
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

  // 清理超时
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // 用于跟踪节点更新状态
  const [isUpdating, setIsUpdating] = useState(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const onNodesUpdate = useCallback((nodes: Node<{ annotation: Annotation }>[]) => {
    console.log('onNodesUpdate', nodes);
    
    // 设置更新状态
    setIsUpdating(true);
    
    // 清除之前的超时
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // 使用 debounce 保存（用于连续移动）
    saveAnnotations(nodes, bookId);
    
    // 设置一个超时，在节点停止移动后立即保存
    // 增加延迟时间，确保注释创建完成
    updateTimeoutRef.current = setTimeout(() => {
      console.log('Nodes stopped moving, saving immediately');
      saveAnnotationsImmediate(nodes, bookId);
      setIsUpdating(false);
    }, 1000); // 增加到 1000ms，给注释创建更多时间
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
