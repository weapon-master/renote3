import React, { useCallback, useEffect } from 'react';
import {
  ReactFlowProvider,
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
  Edge,
  OnConnect,
  addEdge,
  applyNodeChanges,
  NodeChange,
  applyEdgeChanges,
  EdgeChange,
  useReactFlow,
  EdgeTypes,
} from '@xyflow/react';
import NoteNode from './NoteNode';
import NoteEdge from './NoteEdge';
import { NodeTypes } from '@xyflow/react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import { useBookStore } from '@/store/book';
import { useConnectionStore } from '@/store/connection';
import { useAnnotationStore } from '@/store/annotation';
import useCanvasCenter from '@/hooks/flow/useCanvasCenter';
import { NoteConnection } from '@/main/db/$schema';

const nodeTypes: NodeTypes = {
  noteNode: NoteNode,
};

const edgeTypes: EdgeTypes = {
  noteEdge: NoteEdge,
};

interface NoteFlowProps {
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesUpdate?: (nodes: Node[]) => void;
  onEdgesUpdate?: (edges: Edge[]) => void;
}

export default function NoteFlow({
  initialNodes = [],
  initialEdges = [],
  onNodesUpdate,
  onEdgesUpdate,
}: NoteFlowProps) {
  const book = useBookStore(state => state.currBook);
  const updateCard = useAnnotationStore(state => state.updateCard)
  const batchCreateConnections = useConnectionStore(state => state.batchCreateConnections);
  const deleteConnection = useConnectionStore(state => state.deleteConnection);
  const updateConnection = useConnectionStore(state => state.updateConnection);
  const updateCanvasCenterPosition = useAnnotationStore(state => state.updateCanvasCenterPosition);
  const [nodes, setNodes, _onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, _onEdgesChange] = useEdgesState(initialEdges);
  const { getIntersectingNodes } = useReactFlow()
  const getCanvasCenter = useCanvasCenter()
  const canvasCenter = getCanvasCenter()
  const {x, y} = canvasCenter;
  useEffect(() => {
    updateCanvasCenterPosition({ x, y});
  }, [x, y]);
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // console.log('onNodesChange', changes);
      //   if (!changes.every(change => Boolean(change.position))) {
      //     return;
      //   }
      setNodes((nds) => {
        const newNodes = applyNodeChanges(changes, nds);
        // 立即触发保存回调
        onNodesUpdate?.(newNodes);
        return newNodes;
      });
    },
    [setNodes, onNodesUpdate],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // console.log('onEdgesChange', changes);
      setEdges((eds) => {
        const newEdges = applyEdgeChanges(changes, eds);
        // 立即触发保存回调
        onEdgesUpdate?.(newEdges);
        return newEdges;
      });
    },
    [setEdges, onEdgesUpdate],
  );
  const onConnect: OnConnect = useCallback(
    (connection) =>
      setEdges((currentEdges) => {
        const newEdge = {
          ...connection,
          type: 'noteEdge',
          data: { description: '' }
        };
        const newEdges = addEdge(newEdge, currentEdges);
        // 立即触发保存回调
        onEdgesUpdate?.(newEdges);
        return newEdges;
      }),
    [setEdges, onEdgesUpdate],
  );

  // 监听initialNodes和initialEdges的变化，更新内部状态
  useEffect(() => {
    console.log('NoteFlow: initialNodes changed', {
      initialNodesLength: initialNodes.length,
      nodesLength: nodes.length,
      initialNodeIds: initialNodes.map(n => n.id),
      nodeIds: nodes.map(n => n.id)
    });

    // 简化逻辑：直接设置节点，让React Flow处理位置保持
    console.log('NoteFlow: Setting nodes to', initialNodes.length, 'nodes');
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const onNodeDrag = (e: React.MouseEvent<Element, MouseEvent>, n: Node) => {
     const intersections = getIntersectingNodes(n).map(n => n.id);
     setNodes(ns => 
      ns.map(n => ({
        ...n,
        data: {
          ...n.data,
          highlight: intersections.includes(n.id)
        }
      }))
     )
  }

  const onNodeDragStop = (e: React.MouseEvent<Element, MouseEvent>, n: Node) => {
    updateCard(n.id, { position: n.position })
    const intersections = getIntersectingNodes(n)
    
    // 创建边缘
    intersections.forEach((sourceNode) => {
      const newEdge: Edge = {
        id: `${sourceNode.id}-${n.id}`,
        source: sourceNode.id,
        target: n.id,
        type: 'noteEdge',
        data: { description: '' }
      }
      setEdges(eds => addEdge(newEdge, eds))
    })
    
    // 创建连接记录
    const newConnections: NoteConnection[] = intersections.map(srcNode => ({
      id: `${srcNode.id}-${n.id}`,
      bookId: book.id,
      fromCardId: srcNode.id,
      toCardId: n.id,
      description: '',
    }))
    if (!newConnections.length) {
      return;
    }
    batchCreateConnections(book.id, newConnections)
  }

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault(); // prevent default browser menu
      setEdges((eds) => {
        const newEdges = eds.filter((e) => e.id !== edge.id)
        deleteConnection(edge.id);
        return newEdges
      });
    },
    [setEdges]
  );

  // 监听边缘描述更新事件
  useEffect(() => {
    const handleEdgeDescriptionUpdate = (event: CustomEvent) => {
      const { edgeId, description } = event.detail;
      updateConnection(edgeId, { description });
      
      // 更新本地边缘状态
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === edgeId
            ? { ...edge, data: { ...edge.data, description } }
            : edge
        )
      );
    };

    window.addEventListener('edge-description-update', handleEdgeDescriptionUpdate as EventListener);
    
    return () => {
      window.removeEventListener('edge-description-update', handleEdgeDescriptionUpdate as EventListener);
    };
  }, [setEdges, updateConnection]);
  return (
    <div className="notes-canvas">
      {/* <ReactFlowProvider> */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          // onDrop = {onDrop}
          onNodeDragStop={onNodeDragStop}
          onNodeDrag={onNodeDrag}
          onEdgeContextMenu={onEdgeContextMenu}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeStrokeColor="#1a192b"
            nodeColor="#fff"
            nodeBorderRadius={2}
          />
        </ReactFlow>
      {/* </ReactFlowProvider> */}
    </div>
  );
}
