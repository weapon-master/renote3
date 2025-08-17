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
} from '@xyflow/react';
import NoteNode from './NoteNode';
import { NodeTypes } from '@xyflow/react';
import { useNodesState, useEdgesState } from '@xyflow/react';

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
  const [nodes, setNodes, _onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, _onEdgesChange] = useEdgesState(initialEdges);
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      console.log('onNodesChange', changes);
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
      console.log('onEdgesChange', changes);
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
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);
  

  return (
    <div className="notes-canvas">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
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
      </ReactFlowProvider>
    </div>
  );
}
