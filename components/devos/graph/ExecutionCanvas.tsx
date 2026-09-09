'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Panel, 
  useNodesState, 
  useEdgesState,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

import DevOsNode from './DevOsNode';

const nodeTypes = {
  devosNode: DevOsNode,
};

interface ExecutionCanvasProps {
  initialNodes: any[];
  initialEdges: any[];
  onRefresh?: () => void;
  status?: string;
}

export default function ExecutionCanvas({ initialNodes, initialEdges, onRefresh, status }: ExecutionCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when initialNodes changed (polling/real-time)
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const defaultEdgeOptions = useMemo(() => ({
    type: 'smoothstep',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#475569',
    },
    style: {
      strokeWidth: 2,
      stroke: '#475569',
    },
  }), []);

  return (
    <div className="w-full h-[600px] bg-slate-950/50 rounded-2xl border border-white/5 overflow-hidden relative group">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="devos-graph-canvas"
      >
        <Background color="#1e293b" gap={20} />
        <Controls showInteractive={false} className="!bg-slate-900 !border-slate-800 !fill-white" />
        
        <Panel position="top-right" className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'RUNNING' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500'}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase text-white/70">
              {status || 'IDLE'}
            </span>
          </div>
          
          {onRefresh && (
            <button 
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-white/10 text-white/50 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
            </button>
          )}
        </Panel>

        <Panel position="bottom-left">
          <div className="text-[10px] text-white/30 font-mono">
            DevOs Execution Engine v3.0 // Observability Mesh Enabled
          </div>
        </Panel>
      </ReactFlow>

      {/* Glossy Overlay effect */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 rounded-2xl" />
    </div>
  );
}
