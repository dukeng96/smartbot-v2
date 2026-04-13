"use client"

import { useCallback, useRef } from "react"
import type { DragEvent } from "react"
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type OnConnect,
  type IsValidConnection,
  type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"

import { useFlowStore } from "./hooks/use-flow-store"
import { useKeyboardShortcuts } from "./hooks/use-keyboard-shortcuts"
import { NODE_COMPONENT_MAP } from "./nodes/node-types"
import { CustomEdge } from "./edges/custom-edge"
import { CanvasToolbar } from "./toolbar/canvas-toolbar"
import { NodePalette } from "./node-palette/node-palette"
import { ConfigDrawer } from "./config-drawer/config-drawer"
import { TestPanel } from "./test-panel/test-panel"
import { canConnect } from "./utils/connection-rules"
import { NODE_DEFINITION_MAP } from "./utils/node-definitions"

const EDGE_TYPES = { custom: CustomEdge }

interface FlowCanvasProps {
  flowId: string
  botId: string
}

export function FlowCanvas({ flowId, botId }: FlowCanvasProps) {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    connect,
    addNode,
    dirty,
  } = useFlowStore()

  const { screenToFlowPosition } = useReactFlow()
  const paletteRef = useRef<{ open(): void }>(null)

  useKeyboardShortcuts({ flowId, paletteOpen: () => paletteRef.current?.open() })

  const handleConnect: OnConnect = useCallback(
    (params) => {
      if (canConnect(params, edges)) {
        connect(params)
      }
    },
    [edges, connect]
  )

  const isValidConnection: IsValidConnection<Edge> = useCallback(
    (conn) => canConnect(conn, edges),
    [edges]
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      const type = e.dataTransfer.getData("application/reactflow")
      if (!type) return
      const definition = NODE_DEFINITION_MAP[type]
      if (!definition) return
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      addNode(definition, position)
    },
    [screenToFlowPosition, addNode]
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }, [])

  return (
    <div className="flex h-[calc(100vh-56px)] w-full relative">
      <NodePalette ref={paletteRef} />

      <div className="flex-1 relative">
        <CanvasToolbar flowId={flowId} dirty={dirty} />

        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={NODE_COMPONENT_MAP}
          edgeTypes={EDGE_TYPES}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          isValidConnection={isValidConnection}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          fitView
          proOptions={{ hideAttribution: true }}
          deleteKeyCode={null}
        >
          <MiniMap zoomable pannable className="!bottom-16" />
          <Controls className="!bottom-16" />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>

      <ConfigDrawer />
      <TestPanel botId={botId} />
    </div>
  )
}
