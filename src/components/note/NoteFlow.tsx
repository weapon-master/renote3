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
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      console.log('onEdgesChange', changes);
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges],
  );
  const onConnect: OnConnect = useCallback(
    (connection) =>
      setEdges((currentEdges) => addEdge(connection, currentEdges)),
    [setEdges],
  );
  
  // 监听initialNodes和initialEdges的变化，更新内部状态
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);
  
  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);
  
  useEffect(() => {
    onNodesUpdate?.(nodes);
    onEdgesUpdate?.(edges);
  }, [nodes, edges, onNodesUpdate, onEdgesUpdate]);
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
