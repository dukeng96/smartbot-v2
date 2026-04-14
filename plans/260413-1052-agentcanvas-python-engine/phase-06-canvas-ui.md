# Phase 06 — Canvas UI (Next.js + React Flow v12 + shadcn)

**Status:** ⬜ pending

## Goal
Build `/dashboard/bots/[botId]/flow` canvas. Node palette, drag-drop, right-panel config drawer, live chat test panel, inline execution trace, save/load, keyboard shortcuts, undo/redo. Specialized widgets: LLM messages array repeater, Monaco code editor for Custom Tool/Function, CustomTool picker for Agent.

## Stack

Next.js 16 + React Flow v12 + shadcn v4 + Zustand (+ immer) + TypeScript.

## Design decisions

| Decision | Choice |
|---|---|
| Config panel placement | Right-side drawer (shadcn Sheet, 400px) |
| Undo/redo | RF v12 `useUndoRedo()` first-party hook, 50-step stack |
| Keyboard shortcuts | Delete + Cmd+S/Z/Shift-Z/D/C/V/A + Escape |
| Connection validation | BFS `wouldCreateCycle` DAG-only |
| State mutation | Immutable via Zustand + immer |
| Handle ID encoding | `{nodeId}-{direction}-{paramName}-{type}` |
| Confirm dialogs | Promise-based `useConfirm` hook |
| Node palette | cmdk Command Menu |
| Delete-key suppression | `dialogDepth` counter |

## Files to create

```
smartbot-web/src/app/(dashboard)/bots/[botId]/flow/
  page.tsx                            # Server component, fetches bot + flow
  flow-canvas-client.tsx              # Client component wrapper (React Flow needs client)
  layout.tsx                          # Full-bleed layout override (no sidebar pad)

smartbot-web/src/components/features/flow-canvas/
  index.ts
  flow-canvas.tsx                     # Main canvas component
  node-palette/
    node-palette.tsx                  # cmdk Command Menu with draggable items
    node-palette-item.tsx
    node-palette-category.tsx         # Grouped by NodeDefinition.category
  nodes/
    base-node.tsx                     # Shared shell (header, body, handles)
    generic-node.tsx                  # Schema-driven renderer (category color, icon, preview)
    node-types.ts                     # Map type → component
    node-category-styles.ts           # Tailwind classes per category (llm/retrieval/control/etc.)
  edges/
    custom-edge.tsx                   # Animated when executing (uses EdgeLabelRenderer, not v11 EdgeText)
  config-drawer/
    config-drawer.tsx                 # Slide-in shadcn Sheet, 400px wide
    input-editor.tsx                  # Switch on input.type → renders widget
    credential-picker.tsx             # Dropdown fetching /api/v1/credentials
    kb-picker.tsx                     # Multi-select KB dropdown
    variable-picker.tsx               # Autocomplete for {{nodeId.output}} + {{state.var}}
    update-flow-state-editor.tsx      # Repeater field for update_flow_state array
    messages-array-editor.tsx         # LLM node: [{role, content}] repeater
    monaco-code-editor.tsx            # Python/JSON editor for Custom Tool + Custom Function
    custom-tool-picker.tsx            # Agent.tools multi-select from /api/v1/custom-tools
  test-panel/
    test-panel.tsx                    # Bottom-right slide-in chat
    test-message-list.tsx
    test-input.tsx
    inline-trace-overlay.tsx          # Per-node trace badges (duration, tokens, error) on canvas during/after run
  toolbar/
    canvas-toolbar.tsx                # Top bar: Save | Validate | Test | Undo | Redo
    toolbar-keyboard-hints.tsx        # Cmd+S / Cmd+Z labels
  hooks/
    use-flow-store.ts                 # Zustand store (immer middleware)
    use-node-types.ts                 # TanStack Query: GET /flows/node-types
    use-flow-mutations.ts             # Save/update/delete
    use-keyboard-shortcuts.ts         # Cmd+S/Z/Shift-Z/D/C/V/A/Delete/Escape
    use-undo-redo.ts                  # Wraps RF v12 useUndoRedo() + takeSnapshot gates
    use-confirm.tsx                   # Promise-based confirm
    use-dialog-depth.ts               # canvasDialogShow counter
    use-test-run.ts                   # SSE stream + inline trace state
  utils/
    flow-validators.ts                # Client-side pre-validation (orphans, missing required)
    node-factory.ts                   # init-node equivalent: defaults from NodeDefinition
    connection-rules.ts               # canConnect + wouldCreateCycle BFS
    handle-id.ts                      # encode/decode {nodeId}-{dir}-{name}-{type}
    duplicate-node.ts                 # Clone + remap handle IDs + clear refs
```

## Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Toolbar: ← | FlowName | Save | Validate | Test | Undo | Redo │
├──────────┬──────────────────────────────────┬────────────────┤
│ Palette  │                                  │ Config Drawer  │
│ (cmdk)   │     React Flow v12 canvas        │ (shadcn Sheet) │
│ 240px    │                                  │ 400px, slide   │
│          │     - Nodes (category-colored)   │ in on select   │
│ [search] │     - Edges (animated if exec)   │                │
│          │     - Inline trace overlay       │ Selected:      │
│ LLM      │       (duration/tokens/error     │ VNPT LLM       │
│ Retriev  │        badges during run)        │ ──             │
│ Memory   │     - MiniMap, Controls, Bg      │ [Inputs tab]   │
│ Agent    │                                  │ [Update State] │
│ Control  │                                  │ [Advanced]     │
│ ...      │                                  │                │
│          │                                  │                │
├──────────┴──────────────────────────────────┤                │
│ Test Panel (collapsed pill → slide up drawer, 500px tall)    │
│ ┌─ chat messages ─┐                                          │
│ │ User: What's X? │                          [Close]         │
│ │ Bot: X is...    │                                          │
│ └─────────────────┘                                          │
│ [input field] [Send]                                         │
└──────────────────────────────────────────────────────────────┘
```

## Deps to add

```json
"@xyflow/react": "^12.0.0",         // React Flow v12
"cmdk": "^1.0.0",                   // Command menu for palette
"elkjs": "^0.9.3",                  // Auto-layout (optional)
"immer": "^10.0.0",                 // Zustand immer middleware
"lodash.clonedeep": "^4.5.0",       // For duplicateNode deep clone
"@monaco-editor/react": "^4.6.0",   // Monaco editor for Custom Tool/Function (lazy-loaded)
"ajv": "^8.17.0"                    // Client-side JSON Schema Draft-07 validation for CustomTool schema
```

No `@dnd-kit` — use React Flow's built-in `onDrop` + palette item native HTML5 drag.

## Zustand store

```ts
interface FlowStore {
  flowId: string;
  name: string;
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  dirty: boolean;
  dialogDepth: number;               // suppress Delete when >0

  // actions — all immer-backed, immutable
  setFlow(flow: FlowData): void;
  addNode(type: string, position: XYPosition): void;
  updateNodeData(id: string, patch: Partial<NodeData>): void;
  updateNodeStateWrites(id: string, rows: StateUpdate[]): void; // for update_flow_state
  deleteNode(id: string): void;
  connect(params: Connection): void;
  deleteEdge(id: string): void;
  duplicate(id: string): void;       // handle remap + clear {{refs}}
  setSelected(id: string | null): void;
  markClean(): void;
  pushDialogDepth(): void;
  popDialogDepth(): void;
}
```

Undo/redo uses RF v12 `useUndoRedo()`. Call `takeSnapshot()` BEFORE every mutating action in hooks layer.

## React Flow v12 setup

```tsx
'use client'

import { ReactFlow, ReactFlowProvider, MiniMap, Controls, Background, useReactFlow } from '@xyflow/react'
import '@xyflow/react/dist/style.css'

export function FlowCanvas({ flowId }: { flowId: string }) {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } = useFlowStore()
  const { data: nodeTypes } = useNodeTypes()
  const { screenToFlowPosition } = useReactFlow() // v12 — NOT v11 .project()

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('application/reactflow')
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    addNode(type, position)
  }

  return (
    <ReactFlowProvider>
      <div className="flex h-[calc(100vh-56px)]">
        <NodePalette nodeTypes={nodeTypes} />
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_COMPONENT_MAP}
            edgeTypes={{ custom: CustomEdge }}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            isValidConnection={canConnect}  // utils/connection-rules.ts
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap />
            <Controls />
            <Background />
            <InlineTraceOverlay />
          </ReactFlow>
          <CanvasToolbar />
          <TestPanel />
        </div>
        <ConfigDrawer />
      </div>
    </ReactFlowProvider>
  )
}
```

**RF v12 API notes:**
- Use `screenToFlowPosition(xy)` — NOT v11's `.project(xy)`
- Custom edges use `EdgeLabelRenderer` (v11's `EdgeText` removed)

## Node factory + handle encoding

```ts
// utils/handle-id.ts
export function encodeHandleId(nodeId: string, dir: 'in' | 'out', name: string, type: string) {
  return `${nodeId}-${dir}-${name}-${type}`
}
export function decodeHandleId(handleId: string) {
  const [nodeId, dir, name, type] = handleId.split('-')
  return { nodeId, dir, name, type }
}

// utils/node-factory.ts — equivalent of Flowise initNode()
export function createNode(def: NodeDefinition, position: XYPosition): Node {
  const id = `${def.type}_${nanoid(6)}`
  const inputAnchors = def.inputs
    .filter(i => i.type !== 'credential:*' && i.type !== 'string')  // only graph-connectable
    .map(i => ({ id: encodeHandleId(id, 'in', i.name, i.type), name: i.name, type: i.type }))
  const inputParams = def.inputs
    .filter(i => !inputAnchors.find(a => a.name === i.name))        // config-only (text/number/bool)
  const outputAnchors = def.outputs
    .map(o => ({ id: encodeHandleId(id, 'out', o.name, o.type), name: o.name, type: o.type }))
  return {
    id,
    type: def.type,
    position,
    data: {
      definition: def,
      inputAnchors,
      inputParams,
      outputAnchors,
      config: Object.fromEntries(def.inputs.filter(i => i.default !== undefined).map(i => [i.name, i.default])),
      stateWrites: [] as StateUpdate[],  // update_flow_state rows
    },
  }
}
```

## Connection validation

```ts
// utils/connection-rules.ts
export function canConnect(conn: Connection, rf: ReactFlowInstance): boolean {
  if (conn.source === conn.target) return false
  const src = decodeHandleId(conn.sourceHandle!)
  const tgt = decodeHandleId(conn.targetHandle!)
  if (src.type !== tgt.type && tgt.type !== 'any') return false      // type match
  if (wouldCreateCycle(conn.source!, conn.target!, rf)) return false  // DAG-only
  return true
}

export function wouldCreateCycle(sourceId: string, targetId: string, rf: ReactFlowInstance): boolean {
  const adj: Record<string, string[]> = {}
  rf.getEdges().forEach(e => {
    (adj[e.source] ??= []).push(e.target)
  })
  const queue = [targetId]
  const visited = new Set<string>()
  while (queue.length) {
    const node = queue.shift()!
    if (node === sourceId) return true
    if (visited.has(node)) continue
    visited.add(node)
    ;(adj[node] || []).forEach(n => queue.push(n))
  }
  return false
}
```

## Node component — category-styled generic renderer

```tsx
// nodes/generic-node.tsx
const CATEGORY_STYLES: Record<string, string> = {
  llm:       'border-l-4 border-l-violet-500',
  retrieval: 'border-l-4 border-l-blue-500',
  agent:     'border-l-4 border-l-amber-500',
  control:   'border-l-4 border-l-slate-500',
  io:        'border-l-4 border-l-emerald-500',
  tool:      'border-l-4 border-l-rose-500',
  memory:    'border-l-4 border-l-cyan-500',
  utility:   'border-l-4 border-l-gray-400',
}

export function GenericNode({ id, data, selected }: NodeProps) {
  const { definition, inputAnchors, outputAnchors, config } = data
  const trace = useInlineTrace(id)  // from test-panel/use-test-run

  return (
    <div className={cn(
      "rounded-lg border bg-card shadow-sm min-w-[220px]",
      CATEGORY_STYLES[definition.category],
      selected && "ring-2 ring-primary",
      trace?.error && "ring-2 ring-destructive",
      trace?.running && "animate-pulse"
    )}>
      {inputAnchors.map((a, i) => (
        <Handle key={a.id} type="target" position={Position.Left}
          id={a.id} style={{ top: 40 + i * 20 }} />
      ))}

      <div className="px-3 py-2 border-b flex items-center gap-2">
        <LucideIcon name={definition.icon} size={14} />
        <span className="font-semibold text-[13px]">{definition.label}</span>
        <Badge variant="secondary" className="ml-auto text-[10px]">{definition.category}</Badge>
      </div>

      <div className="p-3 space-y-1 text-[12px] text-muted-foreground">
        {Object.entries(config).slice(0, 3).map(([k, v]) => (
          <div key={k}>{k}: <span className="font-mono">{truncate(String(v), 30)}</span></div>
        ))}
      </div>

      {/* Inline trace badge */}
      {trace && (
        <div className="px-3 py-1 border-t bg-muted/30 text-[11px] flex justify-between">
          <span>{trace.duration}ms</span>
          {trace.tokens && <span>{trace.tokens} tok</span>}
          {trace.error && <span className="text-destructive">error</span>}
        </div>
      )}

      {outputAnchors.map((a, i) => (
        <Handle key={a.id} type="source" position={Position.Right}
          id={a.id} style={{ top: 40 + i * 20 }} />
      ))}
    </div>
  )
}
```

## Config drawer

```tsx
// config-drawer/config-drawer.tsx
export function ConfigDrawer() {
  const selected = useFlowStore(s => s.selectedNodeId)
  const node = useFlowStore(s => s.nodes.find(n => n.id === selected))

  return (
    <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
      <SheetContent side="right" className="w-[400px] sm:max-w-[400px]">
        {!node ? <EmptyState>Chọn node để chỉnh sửa</EmptyState> : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <LucideIcon name={node.data.definition.icon} />
                {node.data.definition.label}
              </SheetTitle>
              <SheetDescription>{node.data.definition.description}</SheetDescription>
            </SheetHeader>

            <Tabs defaultValue="inputs" className="mt-4">
              <TabsList>
                <TabsTrigger value="inputs">Inputs</TabsTrigger>
                <TabsTrigger value="state">Update State</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="inputs" className="space-y-3">
                {node.data.definition.inputs.map(input => (
                  <InputEditor key={input.name} input={input}
                    value={node.data.config?.[input.name]}
                    nodeId={node.id}
                    onChange={(v) => updateNodeData(node.id, { config: { ...node.data.config, [input.name]: v } })}
                  />
                ))}
              </TabsContent>

              <TabsContent value="state">
                <UpdateFlowStateEditor nodeId={node.id} />
              </TabsContent>

              <TabsContent value="advanced">
                <NodeIdField nodeId={node.id} />
                <PositionFields nodeId={node.id} />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
```

## Update Flow State editor

```tsx
// config-drawer/update-flow-state-editor.tsx — repeater field UI
export function UpdateFlowStateEditor({ nodeId }: { nodeId: string }) {
  const rows = useFlowStore(s => s.nodes.find(n => n.id === nodeId)?.data.stateWrites ?? [])
  const update = useFlowStore(s => s.updateNodeStateWrites)

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Write this node's output into top-level state. Downstream nodes reference as{' '}
        <code>{'{{state.key}}'}</code>.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="flex gap-2 items-start">
          <Input placeholder="key (e.g. last_answer)" value={row.key}
            onChange={(e) => update(nodeId, rows.map((r, j) => j === i ? { ...r, key: e.target.value } : r))} />
          <VariablePicker value={row.value} nodeId={nodeId}
            onChange={(v) => update(nodeId, rows.map((r, j) => j === i ? { ...r, value: v } : r))}
            allowSelfNode  // enables {{$node.output}}
          />
          <Button size="icon" variant="ghost" onClick={() => update(nodeId, rows.filter((_, j) => j !== i))}>
            <X size={14} />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={() => update(nodeId, [...rows, { key: '', value: '' }])}>
        <Plus size={12} /> Add state write
      </Button>
    </div>
  )
}
```

## LLM messages array editor

Renders a repeater of `{role, content}` rows. `role` is a Select (system/user/assistant); `content` is a textarea with inline VariablePicker for `{{state.*}}` / `{{node.output}}` refs. Rows are reorderable via drag handle.

```tsx
// config-drawer/messages-array-editor.tsx
const ROLES = ['system', 'user', 'assistant'] as const

export function MessagesArrayEditor({ nodeId, value, onChange }: Props) {
  const rows = value ?? []

  const update = (i: number, patch: Partial<Message>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  const add = () => onChange([...rows, { role: 'user', content: '' }])
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i))
  const move = (from: number, to: number) => {
    const next = [...rows]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Multi-role prompt. Supports <code>{'{{state.var}}'}</code> and{' '}
        <code>{'{{nodeId.output}}'}</code> in content.
      </p>
      {rows.map((row, i) => (
        <div key={i} className="rounded-md border p-2 space-y-2 bg-card">
          <div className="flex items-center gap-2">
            <GripVertical size={12} className="cursor-grab text-muted-foreground" />
            <Select value={row.role} onValueChange={(v) => update(i, { role: v as Role })}>
              <SelectTrigger className="h-7 w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="ml-auto" onClick={() => remove(i)}>
              <X size={12} />
            </Button>
          </div>
          <VariablePickerTextarea
            nodeId={nodeId}
            value={row.content}
            placeholder={row.role === 'system' ? 'You are a helpful assistant...' : 'Hello {{state.user_name}}'}
            rows={row.role === 'system' ? 4 : 2}
            onChange={(v) => update(i, { content: v })}
          />
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add}>
        <Plus size={12} /> Add message
      </Button>
    </div>
  )
}
```

**Validation (client-side):**
- At least 1 row required (InputEditor shows error if empty)
- At least 1 `user` role row required (LLM would fail otherwise)
- Empty `content` → warning (not hard block — `{{ref}}` may resolve at runtime)

**Wiring:** `InputEditor` switches `input.type === 'messages'` → renders `<MessagesArrayEditor />`. The LLM node definition (Phase 04) declares `inputs: [{ name: 'messages', type: 'messages', required: true }]`.

## Monaco code editor (Custom Tool / Custom Function)

Single shared component, auto-selects language by `input.type`:
- `python` → Python syntax (Custom Tool `implementation`, Custom Function `code`)
- `json-schema` → JSON with schema validation (Custom Tool `schema`)

```tsx
// config-drawer/monaco-code-editor.tsx
import Editor, { loader } from '@monaco-editor/react'
import { useEffect, useRef, useState } from 'react'

// Self-host Monaco from /public/monaco-editor/ to avoid CDN + CSP issues (see Risks)
loader.config({ paths: { vs: '/monaco-editor/vs' } })

type Lang = 'python' | 'json-schema'

export function MonacoCodeEditor({ language, value, onChange, schemaForValidation }: Props) {
  const editorRef = useRef<any>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])

  useEffect(() => {
    if (language !== 'json-schema') return
    try {
      const ajv = new Ajv({ strict: false })
      ajv.compile(JSON.parse(value || '{}'))
      setValidationErrors([])
    } catch (e: any) {
      setValidationErrors([e.message])
    }
  }, [value, language])

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center px-2 py-1 border-b text-[11px] text-muted-foreground bg-muted/30">
        <span>{language === 'python' ? 'Python (RestrictedPython)' : 'JSON Schema (Draft-07)'}</span>
        {validationErrors.length > 0 && (
          <span className="ml-auto text-destructive">{validationErrors[0]}</span>
        )}
      </div>
      <Editor
        height="320px"
        language={language === 'json-schema' ? 'json' : 'python'}
        value={value}
        onChange={(v) => onChange(v ?? '')}
        onMount={(editor) => { editorRef.current = editor }}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          tabSize: 4,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          readOnly: false,
        }}
      />
    </div>
  )
}
```

**Custom Tool drawer layout** — three Monaco panels stacked in the Inputs tab:
1. `name` — plain Input (snake_case, unique per tenant)
2. `description` — Textarea (shown to Agent LLM)
3. `schema` — Monaco (`json-schema` mode) with live ajv validation
4. `implementation` — Monaco (`python` mode) — placeholder shows signature `def run(args: dict) -> dict:`
5. **"Test"** button → opens modal with sample input JSON → `POST /api/v1/custom-tools/:id/test` → shows `{output, duration_ms, error?}`

**Custom Function drawer layout:**
1. `state_refs` — VariablePicker multi-select (which state keys to read)
2. `code` — Monaco Python mode
3. Sidebar panel lists allowed imports (`math`, `re`, `json`, `datetime`, etc. — from Phase 04.5 whitelist)
4. Output type annotation hint in footer

**Lazy loading:** Dynamic import on first drawer open — Monaco is ~2MB. Use `next/dynamic` with `ssr: false` + Skeleton placeholder.

```tsx
const MonacoCodeEditor = dynamic(() => import('./monaco-code-editor').then(m => m.MonacoCodeEditor), {
  ssr: false,
  loading: () => <Skeleton className="h-[340px] w-full" />,
})
```

**CSP / security considerations (detail in Phase 04.5):**
- Monaco uses `eval` internally for tokenization; if strict CSP blocks `unsafe-eval`, self-host worker + whitelist `'self'` for worker-src
- User-authored code is NOT executed client-side — only rendered + POSTed to engine `/v1/sandbox/execute-tool` for server-side RestrictedPython
- No Python runtime in the browser (no Pyodide) — keeps bundle small + avoids false sandbox expectations

## CustomTool picker (Agent node `tools` input)

Multi-select dropdown fetching tenant's CustomTools. Used exclusively by Agent node `tools: string[]` input (array of CustomTool UUIDs).

```tsx
// config-drawer/custom-tool-picker.tsx
export function CustomToolPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data: tools = [], isLoading } = useQuery({
    queryKey: ['custom-tools'],
    queryFn: () => fetch('/api/v1/custom-tools').then(r => r.json()),
  })

  // Detect stale refs: value contains IDs not in tools list (deleted tool)
  const staleIds = value.filter(id => !tools.find((t: CustomTool) => t.id === id))

  return (
    <div className="space-y-2">
      {staleIds.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertTriangle size={12} />
          <AlertDescription className="text-[11px]">
            {staleIds.length} tool{staleIds.length > 1 ? 's' : ''} no longer exist. Remove or replace.
          </AlertDescription>
        </Alert>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span>{value.length === 0 ? 'Select tools...' : `${value.length} selected`}</span>
            <ChevronDown size={12} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[360px] p-0">
          <Command>
            <CommandInput placeholder="Search tools..." />
            <CommandList>
              <CommandEmpty>
                {isLoading ? 'Loading...' : (
                  <>No tools.{' '}
                    <Link href="/dashboard/custom-tools/new" className="underline">Create one</Link>
                  </>
                )}
              </CommandEmpty>
              {tools.map((t: CustomTool) => (
                <CommandItem key={t.id} onSelect={() => {
                  onChange(value.includes(t.id) ? value.filter(id => id !== t.id) : [...value, t.id])
                }}>
                  <Check size={12} className={cn('mr-2', value.includes(t.id) ? 'opacity-100' : 'opacity-0')} />
                  <div className="flex-1">
                    <div className="font-mono text-[12px]">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{t.description}</div>
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map(id => {
            const t = tools.find((t: CustomTool) => t.id === id)
            return (
              <Badge key={id} variant={t ? 'secondary' : 'destructive'} className="text-[10px]">
                {t?.name ?? `deleted (${id.slice(0, 8)})`}
                <button className="ml-1" onClick={() => onChange(value.filter(v => v !== id))}>
                  <X size={10} />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
```

**Wiring:** Agent node definition (Phase 04) declares `inputs: [{ name: 'tools', type: 'custom_tool[]' }]`. `InputEditor` switches `input.type === 'custom_tool[]'` → renders `<CustomToolPicker />`.

**Navigation:** Empty state links to Custom Tool management page (`/dashboard/custom-tools`) — separate route outside flow canvas.

## Variable picker — `{{nodeId.output}}` + `{{state.var}}` autocomplete

```tsx
// config-drawer/variable-picker.tsx
export function VariablePicker({ value, nodeId, onChange, allowSelfNode }: Props) {
  const nodes = useFlowStore(s => s.nodes)
  const self = nodes.find(n => n.id === nodeId)

  // Build suggestions: state.*, {{n2.output}} for upstream nodes, {{$node.output}} if allowed
  const suggestions = useMemo(() => {
    const upstream = getUpstreamNodes(nodeId, nodes, useFlowStore.getState().edges)
    const fromNodes = upstream.flatMap(n =>
      n.data.definition.outputs.map(o => `{{${n.id}.${o.name}}}`)
    )
    const selfRefs = allowSelfNode && self
      ? self.data.definition.outputs.map(o => `{{$node.${o.name}}}`)
      : []
    return [...fromNodes, ...selfRefs]
  }, [nodeId, nodes, allowSelfNode, self])

  return (
    <Combobox value={value} options={suggestions} onChange={onChange} allowCustom />
  )
}
```

## Test panel — live chat drawer + SSE streaming

```tsx
// test-panel/test-panel.tsx — slide-up from bottom
export function TestPanel() {
  const [open, setOpen] = useState(false)
  const { messages, send, running, traces } = useTestRun()  // hits /api/v1/flows/:id/execute SSE

  useEffect(() => {
    // Stream traces into InlineTraceOverlay store
    traces.forEach(t => inlineTraceStore.upsert(t))
  }, [traces])

  return (
    <Drawer open={open} onOpenChange={setOpen} direction="bottom">
      <DrawerTrigger asChild>
        <Button className="fixed bottom-4 right-4" variant="default">
          <MessageSquare size={14} /> Test flow
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[500px]">
        <TestMessageList messages={messages} />
        <TestInput onSend={send} disabled={running} />
      </DrawerContent>
    </Drawer>
  )
}
```

**SSE integration (Phase 07 bridges to Python engine):**
- `POST /api/v1/flows/:id/execute` body `{ message }` → SSE stream
- Events: `node_start`, `node_end`, `token`, `state_updated`, `done`, `error`
- `node_start/end` → update InlineTraceOverlay (badge on canvas node)
- `token` → append to current assistant message in test-panel
- `state_updated` → show toast "state.key = value"

## Inline trace overlay (during + after run)

```tsx
// test-panel/inline-trace-overlay.tsx
// Global Zustand slice keyed by nodeId → { running, duration, tokens, error, output }
// Consumed by GenericNode via useInlineTrace(nodeId)
// Cleared on new test run or flow edit
```

## Keyboard shortcuts

```ts
// hooks/use-keyboard-shortcuts.ts — all gated by dialogDepth === 0
const shortcuts = {
  'Delete':       () => deleteSelected(),
  'Backspace':    () => deleteSelected(),
  'Mod+s':        () => save(),          // save (debounced)
  'Mod+z':        () => undo(),
  'Mod+Shift+z':  () => redo(),
  'Mod+d':        () => duplicateSelected(),
  'Mod+c':        () => copyToClipboard(),
  'Mod+v':        () => pasteFromClipboard(),
  'Mod+a':        () => selectAll(),
  'Escape':       () => setSelected(null),  // close config drawer
}

// Suppress when dialog/input focused — use-dialog-depth.ts
// On input focus: pushDialogDepth() ; on blur: popDialogDepth()
```

## Duplicate node

```ts
// utils/duplicate-node.ts
export function duplicateNode(srcId: string, store: FlowStore): Node {
  const src = store.nodes.find(n => n.id === srcId)!
  const newId = `${src.data.definition.type}_${nanoid(6)}`
  const cloned = cloneDeep(src)
  cloned.id = newId
  cloned.data.id = newId
  cloned.position = { x: src.position.x + (src.width ?? 220) + 50, y: src.position.y }

  // Remap handle IDs
  cloned.data.inputAnchors = cloned.data.inputAnchors.map(a =>
    ({ ...a, id: a.id.replace(srcId, newId) }))
  cloned.data.outputAnchors = cloned.data.outputAnchors.map(a =>
    ({ ...a, id: a.id.replace(srcId, newId) }))

  // Clear {{refs}} — stale references to other nodes break after duplicate
  Object.keys(cloned.data.config || {}).forEach(k => {
    const v = cloned.data.config[k]
    if (typeof v === 'string' && v.startsWith('{{')) cloned.data.config[k] = ''
  })

  return cloned
}
```

## Success criteria

- [ ] Canvas loads existing flow from `/api/v1/flows/:id`
- [ ] Drag from cmdk palette → `screenToFlowPosition` → node placed correctly
- [ ] Click node → right-panel Sheet opens with Inputs/Update State/Advanced tabs
- [ ] Connect nodes → edge rendered; `wouldCreateCycle` blocks DAG violations
- [ ] Incompatible handle types → rejected (no edge created)
- [ ] Save button → PATCH flow, toast, dirty flag cleared
- [ ] Validate button → calls engine validate, highlights error nodes red
- [ ] Dirty state → `beforeunload` warn on navigate away
- [ ] Undo/redo via `useUndoRedo()` — 50 ops stack, Cmd+Z / Cmd+Shift+Z
- [ ] All 9 keyboard shortcuts work; suppressed when `dialogDepth > 0`
- [ ] Duplicate (Cmd+D): handle IDs remapped, `{{refs}}` cleared, positioned +50px right
- [ ] Copy/paste (Cmd+C/V): multi-node selection supported
- [ ] Test panel: send message → SSE stream → tokens appear in chat + inline trace on canvas nodes
- [ ] Inline trace: running node pulses, finished node shows duration/tokens, errored node red ring
- [ ] Update Flow State: add row → `{key, value}` saved → downstream `VariablePicker` shows `{{state.key}}`
- [ ] VariablePicker shows upstream node outputs + self `{{$node.output}}` (when `allowSelfNode`)
- [ ] Category colors visible on all node types (llm=violet, retrieval=blue, etc.)
- [ ] Mobile: graceful "not supported on mobile" message (canvas desktop-only)

**Widget checks:**
- [ ] LLM node messages array: add/remove/reorder rows works; role dropdown switches system/user/assistant; content textarea accepts `{{state.*}}` + `{{nodeId.output}}` via VariablePicker; validation fails when 0 user-role rows
- [ ] Monaco editor loads Python syntax highlighting on Custom Tool `implementation` + Custom Function `code` (self-hosted from `/public/monaco-editor/vs`, no CDN fetch)
- [ ] Monaco JSON schema mode validates CustomTool `schema` live via ajv Draft-07; invalid schema → inline error banner in drawer header
- [ ] CustomToolPicker fetches `/api/v1/custom-tools` via TanStack Query; displays selected tools as Badges; stale-ref (deleted tool) → destructive Alert + destructive Badge; empty state links to `/dashboard/custom-tools/new`
- [ ] Custom Tool drawer **Test** button → POST `/api/v1/custom-tools/:id/test` → displays `{output, duration_ms, error?}` in modal

## Risks

- **React Flow v12 + Next.js 16 SSR** — must `'use client'` + dynamic import `ssr: false` on FlowCanvas
- **Zustand + RF onNodesChange conflict** — use `applyNodeChanges(changes, nodes)` immutably; do not mutate
- **SSE through NestJS proxy** — Phase 07 must set `X-Accel-Buffering: no`; confirm streaming works end-to-end
- **Inline trace store memory** — clear on new run to avoid leak across 100+ executions
- **cmdk + drag** — cmdk items aren't natively draggable; wrap in `draggable` div with `onDragStart` setting `application/reactflow` data
- **Large flows (100+ nodes) perf** — enable RF `onlyRenderVisibleElements`

## Out of scope

- Collaborative editing (real-time multi-user)
- Version history view (Phase 09 handles execution history, not flow versions)
- AI flow generator (Flowise has this — defer post-MVP)
- Auto-layout button (elkjs — nice to have, not required)
- Mobile canvas editing
- Condition Agent visual routing UI (deferred post-MVP)

## Dependencies

- Phase 05 Flow CRUD API (load/save endpoints)
- Phase 07 SSE execution endpoint (for test panel + inline trace)
- Research report: [researcher-260413-1646-flowise-canvas-ux-patterns.md](research/researcher-260413-1646-flowise-canvas-ux-patterns.md)

## Known Gaps (deferred, not MVP blockers)

1. **Undo/redo disabled** — `useUndoRedo` not exported in `@xyflow/react@12.10.2`. Undo/redo toolbar buttons are rendered but disabled. Re-enable when RF ships the hook or version is upgraded. Tracked: `canvas-toolbar.tsx` undo/redo stubs.

2. **`state_updated` visual panel** — `state_updated` SSE events are parsed in `use-test-run.ts` but not displayed (no state inspector panel). Deferred to post-MVP canvas polish pass. Shape conflict between team-lead spec `{ key, value }` and dev-backend answer `{ node_id, updates: { key: value } }` — confirm Python engine's actual emit shape before building inspector. Silent no-op if shape wrong (no user-visible breakage).

## Unresolved questions

1. **Multi-select Delete confirm** — Add confirm for 3+ nodes?
2. **Copy/paste across tabs** — clipboard API vs Zustand-only? Cross-tab = nice dev UX but adds scope.
3. **Right-panel auto-close on canvas click** — current design: stays open until Escape or new selection. Confirm with user.
4. **Test panel chat persistence** — clear on page reload or keep history per flow? Simpler: ephemeral.
5. **`state_updated` exact shape** — `{ key, value }` (team-lead) vs `{ node_id, updates: { key: value } }` (dev-backend) — needs Python engine author to confirm.
