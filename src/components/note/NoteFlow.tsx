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
} from '@xyflow/react';
import NoteNode from './NoteNode';
import { NodeTypes } from '@xyflow/react';
import { useNodesState, useEdgesState } from '@xyflow/react';
import { useCardStore } from '@/store/card';
import { useBookStore } from '@/store/book';
import { useConnectionStore } from '@/store/connection';

const nodeTypes: NodeTypes = {
  noteNode: NoteNode,
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
  const updateCard = useCardStore(state => state.updateCard)
  const batchCreateConnections = useConnectionStore(state => state.batchCreateConnections);
  const [nodes, setNodes, _onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, _onEdgesChange] = useEdgesState(initialEdges);
  const { getIntersectingNodes } = useReactFlow()
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
        const newEdges = addEdge(connection, currentEdges);
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
    intersections.forEach((sourceNode) => {
      const newEdge = {
        id: `${sourceNode.id}-${n.id}`,
        source: sourceNode.id,
        target: n.id,
      }
      setEdges(eds => addEdge(newEdge, eds))
      const newConnections = intersections.map(srcNode => ({
        id: `${srcNode.id}-${n.id}`,
        bookId: book.id,
        fromCardId: srcNode.id,
        toCardId: n.id,
        description: '',
      }))
      batchCreateConnections(book.id, newConnections)
    })

  }
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
          // onDrop = {onDrop}
          onNodeDragStop={onNodeDragStop}
          onNodeDrag={onNodeDrag}
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
