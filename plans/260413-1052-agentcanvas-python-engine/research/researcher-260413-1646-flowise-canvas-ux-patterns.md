# Flowise Canvas UX Patterns — Research Report

**Date:** 2026-04-13  
**Scope:** `smart-agent/packages/ui/src/views/canvas/` + related utils/hooks  
**Purpose:** Inform Phase 06 (Canvas UI) of smartbot-v2 agentcanvas plan  
**React Flow version in Flowise:** v11 (smartbot-v2 targets v12 — API diffs flagged throughout)

---

## 1. State Architecture

### Redux Store Shape

**File:** `smart-agent/packages/ui/src/store/reducers/canvasReducer.js` (56 lines)

```js
// Initial state (lines 1-10)
{
  isDirty: false,
  chatflow: null,
  canvasDialogShow: false,
  componentNodes: [],
  componentCredentials: []
}
```

Actions:
- `SET_DIRTY` / `REMOVE_DIRTY` — tracks unsaved changes
- `SET_CHATFLOW` / `UPDATE_CHATFLOW` — flow metadata
- `SHOW_CANVAS_DIALOG` / `HIDE_CANVAS_DIALOG` — dialog visibility (suppresses delete key)
- `SET_COMPONENT_NODES` / `SET_COMPONENT_CREDENTIALS` — node/credential catalog

**`canvasDialogShow` is the most important flag.** When `true`, `deleteKeyCode` prop on `<ReactFlow>` is set to `null`, preventing accidental node deletion while a dialog is open. Used in: `NodeInputHandler`, `CredentialInputHandler`, `AdditionalParamsDialog`, all modal-opening paths.

File: `index.jsx:362` — `deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}`

### React Flow Local State

`index.jsx` owns nodes/edges via React state (`useState`), not Redux:
```js
// index.jsx lines ~90-100
const [nodes, setNodes, onNodesChange] = useNodesState([])
const [edges, setEdges, onEdgesChange] = useEdgesState([])
```

Node and edge mutations always go through RF's own state handlers. Redux only holds metadata (isDirty, chatflow definition, component catalog).

### flowContext (ReactFlowContext)

**File:** `smart-agent/packages/ui/src/store/context/ReactFlowContext.jsx`

Provides to entire canvas subtree:
- `reactFlowInstance` / `setReactFlowInstance`
- `deleteNode(id)` — recursive descendant deletion
- `deleteEdge(id)` — clears target input value
- `duplicateNode(id, distance)` — deep clone + ID remapping
- `onNodeDataChange(id, data)` — propagates node data mutations

**Port Recommendation: COPY-PATTERN** (adapt Redux → Zustand, keep context shape identical)  
**Confidence: HIGH**

The two-layer pattern (Zustand for metadata + RF state for nodes/edges + Context for operations) maps cleanly to smartbot-v2's Zustand-first architecture. Do not collapse all state into a single Zustand store — the RF state hooks must own nodes/edges for RF internals to work correctly.

**Migration:**
- `canvasReducer.js` → single Zustand `useCanvasStore` slice
- `SET_DIRTY`/`REMOVE_DIRTY` → `setDirty(bool)` action
- `canvasDialogShow` → `dialogOpen: number` (count-based to handle nested dialogs safely)
- Keep `flowContext` as React Context, not Zustand

---

## 2. Canvas Interactions

### Drop Handling

**File:** `index.jsx` lines ~270-310

```js
const onDrop = useCallback((event) => {
  event.preventDefault()
  const nodeData = JSON.parse(event.dataTransfer.getData('application/reactflow'))
  // RF v11 API — MUST CHANGE FOR v12:
  const position = reactFlowInstance.project({ x: event.clientX - ..., y: event.clientY - ... })
  const newNode = initNode(nodeData, getUniqueNodeId(...))
  newNode.position = position
  setNodes((nds) => nds.concat(newNode))
}, [reactFlowInstance])
```

**v11 → v12 API change:** `reactFlowInstance.project(xy)` renamed to `reactFlowInstance.screenToFlowPosition(xy)`. Direct drop-in rename — same signature.

**File:** `AddNodes.jsx` lines ~200-210 (drag source)
```js
const onDragStart = (event, node) => {
  event.dataTransfer.setData('application/reactflow', JSON.stringify(node))
  event.dataTransfer.effectAllowed = 'move'
}
```

### Connect Handling

**File:** `index.jsx` lines ~315-345

```js
const onConnect = useCallback((params) => {
  const newEdge = {
    ...params,
    type: 'buttonedge',
    id: `${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`,
    data: { label: '' }
  }
  // Variable references: source node output embeds as {{nodeId.data.instance}}
  setEdges((eds) => addEdge(newEdge, eds))
  setNodes((nds) => nds.map(node => {
    if (node.id === params.target) {
      // Sets node.data.inputs[inputName] = `{{sourceNodeId.data.instance}}`
    }
    return node
  }))
  dispatch({ type: SET_DIRTY })
}, [])
```

Key: connected input values are stored as `{{nodeId.data.instance}}` strings — evaluated at execution time. When an edge is deleted, this string is cleared from `node.data.inputs`.

### Save / Load Flow

**File:** `index.jsx` lines ~200-265

Save:
1. `reactFlowInstance.toObject()` → gets `{ nodes, edges, viewport }`
2. Strip credential values from `node.data.inputs` before persist
3. PATCH `/api/v1/chatflows/{id}` with `{ flowData: JSON.stringify(rfObject) }`
4. `dispatch(REMOVE_DIRTY)`

Load:
1. GET `/api/v1/chatflows/{id}` → parse `flowData`
2. `nodes.map(initNode)` to re-hydrate
3. `setNodes(nodes); setEdges(edges); setTimeout(fitView, 0)`

**Port Recommendation: COPY-PATTERN**  
**Confidence: HIGH**

The save/load shape is clean and minimal. Adapt to smartbot-v2 API routes. Critical: strip credentials before save (security invariant).

### initNode — Node Hydration

**File:** `smart-agent/packages/ui/src/utils/genericHelper.js` lines ~120-200

```js
function initNode(nodeData, newNodeId, isAgentflow) {
  const inputAnchors = []
  const inputParams = []
  const PARAM_WHITELIST = ['string','number','boolean','options','multiOptions',
    'datagrid','code','json','file','password','asyncOptions','asyncMultiOptions',
    'credential','tabs','array','conditionFunction']

  nodeData.inputs.forEach(input => {
    if (PARAM_WHITELIST.includes(input.type)) inputParams.push(input)
    else inputAnchors.push(input)
  })

  return {
    id: newNodeId,
    type: 'customNode',
    position: { x: 0, y: 0 },
    data: {
      ...nodeData,
      id: newNodeId,
      inputAnchors,
      inputParams,
      inputs: {},       // runtime values (user-filled)
      outputs: {},      // selected output type
      credential: ''    // selected credential ID
    }
  }
}
```

Handle ID format: `{nodeId}-input-{paramName}-{type}` (source/target anchors).

**Port Recommendation: COPY-PATTERN — critical**  
**Confidence: HIGH**

`initNode` is the single most important utility. The split into `inputAnchors` (connection handles) vs `inputParams` (UI form fields) is fundamental to how Flowise separates structural connections from configuration. Re-implement identically for smartbot-v2.

---

## 3. Right-Panel Config (Node Configuration)

Flowise does NOT use a right-side drawer/panel. All configuration is inline within the node card.

### CanvasNode Layout

**File:** `smart-agent/packages/ui/src/views/canvas/CanvasNode.jsx` lines ~50-298

Structure (top-to-bottom within node card):
1. Node header: icon + label + version badge
2. Outdated warning: orange triangle if `data.version < componentNode.version`
3. Input section: `inputAnchors` rendered as Handles (left side), `inputParams` rendered via `<NodeInputHandler>`
4. Output section: rendered via `<NodeOutputHandler>` (right side)
5. "Additional Parameters" button → opens `<AdditionalParamsDialog>` modal
6. Hover overlay: `<NodeTooltip>` reveals Duplicate/Delete/Info buttons

Selected state: `data.selected` → `border: 2px solid theme.palette.primary.main`

**Port Recommendation: RE-INVENT (structure), COPY-PATTERN (logic)**  
**Confidence: MEDIUM**

The inline-config pattern forces users to zoom in to configure nodes — acceptable for Flowise's node count but may feel cramped for complex nodes. smartbot-v2 should implement a slide-in right panel triggered on node click, keeping the node card lean. The `inputAnchors` / `inputParams` split and the Additional Parameters overflow pattern are worth copying.

### NodeInputHandler Field Types

**File:** `smart-agent/packages/ui/src/views/canvas/NodeInputHandler.jsx` (~1350 lines)

Type → Component mapping (MUI components — all need shadcn/ui equivalents):

| Type | MUI Component | shadcn Equivalent |
|------|--------------|-------------------|
| `string` | `<Input>` / `<RichInput>` | `<Input>` / `<Textarea>` |
| `password` | `<Input type="password">` | `<Input type="password">` |
| `number` | `<Input type="number">` | `<Input type="number">` |
| `boolean` | `<SwitchInput>` | `<Switch>` |
| `options` | `<Dropdown>` | `<Select>` |
| `multiOptions` | `<MultiDropdown>` | `<MultiSelect>` (cmdk) |
| `asyncOptions` | `<AsyncDropdown>` | async `<Select>` |
| `json` | `<JsonEditorInput>` | CodeMirror JSON mode |
| `code` | `<CodeEditor>` (CodeMirror) | CodeMirror |
| `file` | `<File>` | `<input type="file">` + dnd |
| `datagrid` | MUI X `<DataGrid>` | TanStack Table |
| `credential` | `<CredentialInputHandler>` | custom |
| `tabs` | MUI `<Tabs>` | shadcn `<Tabs>` |
| `conditionFunction` | button → `<ConditionDialog>` | button → dialog |
| `array` | `<ArrayRenderer>` | custom |

The `acceptVariable` flag on a param means: render both a Handle (for edge connections) AND a form field. The Handle allows other nodes' outputs to be wired in; the form field provides a fallback default.

Mutation pattern — **NOT immutable** (important):
```js
// NodeInputHandler.jsx ~line 890
data.inputs[inputName] = newValue  // direct mutation
onNodeDataChange(nodeId, data)      // propagates up
```
This is a known Flowise anti-pattern. smartbot-v2 should use immutable updates.

**Port Recommendation: RE-INVENT (MUI → shadcn), COPY-PATTERN (type dispatch logic)**  
**Confidence: HIGH**

The type-dispatch pattern is essential. The MUI components must be replaced 1:1 with shadcn equivalents. Adopt immutable updates (`{ ...data, inputs: { ...data.inputs, [name]: value } }`).

### AdditionalParamsDialog

Parameters with `additionalParams: true` are hidden from the node card and shown only in this modal. This is how Flowise handles nodes with 10+ params — keeps the canvas readable.

**Port Recommendation: COPY-PATTERN**  
**Confidence: HIGH**

---

## 4. Keyboard Shortcuts

**File:** `index.jsx` line 362

```jsx
<ReactFlow
  deleteKeyCode={canvas.canvasDialogShow ? null : ['Delete']}
  // No other keyboard shortcuts configured
/>
```

Flowise relies entirely on React Flow's built-in keyboard handling. There is NO custom keyboard shortcut implementation:
- No `Cmd+S` / `Ctrl+S` for save
- No `Cmd+Z` / `Ctrl+Z` for undo
- No `Cmd+D` for duplicate
- No `Escape` to deselect
- No multi-select shortcuts

The only keyboard behavior: `Delete` key removes selected nodes/edges (disabled when `canvasDialogShow=true`).

Grep results confirmed: no `useKeyPress`, no `hotkeys`, no `keyboard`, no `Mousetrap` usage in canvas files.

**v11 → v12 change:** `deleteKeyCode` prop still exists in v12 but accepts the same format. No change needed.

**Port Recommendation: RE-INVENT (smartbot-v2 should add Cmd+S, Cmd+Z at minimum)**  
**Confidence: HIGH**

Flowise's keyboard story is intentionally minimal — the product targets non-developer users. smartbot-v2 (developer tool) should add:
- `Cmd/Ctrl+S` → save flow
- `Cmd/Ctrl+Z` / `Cmd/Ctrl+Y` → undo/redo (requires history implementation)
- `Escape` → deselect / close panel
- `Cmd/Ctrl+D` → duplicate selected node

Use RF's `<ReactFlow onKeyDown>` or a library like `hotkeys-js`.

---

## 5. Undo / Redo

**Flowise has NO undo/redo implementation.**

Grep results for `undo`, `redo`, `history`, `useHistory` across all canvas files returned zero matches. The dirty state (`isDirty`) tracks unsaved changes but there is no action history stack.

**Port Recommendation: RE-INVENT**  
**Confidence: HIGH (absence confirmed)**

React Flow v12 ships `useUndoRedo()` hook as a first-party primitive:
```js
import { useUndoRedo } from '@xyflow/react'
const { undo, redo, canUndo, canRedo, takeSnapshot } = useUndoRedo()
```
Call `takeSnapshot()` before every mutating operation (add node, delete node, connect, disconnect, move). This is the recommended v12 approach and eliminates any custom implementation.

Risk: `useUndoRedo` is v12-only. Verify it handles edge state correctly in addition to node state (RF docs show node-only examples; edge history may need manual snapshot augmentation).

---

## 6. Copy / Paste / Duplicate

### Full-Flow Paste (JSON Import)

**File:** `index.jsx` lines ~530-560

```js
useEffect(() => {
  window.addEventListener('paste', onPaste)
  return () => window.removeEventListener('paste', onPaste)
}, [reactFlowInstance])

const onPaste = useCallback((e) => {
  const pasteData = e.clipboardData.getData('text/plain')
  try {
    const parsedData = JSON.parse(pasteData)
    if (parsedData.nodes && parsedData.edges) {
      handleLoadFlow(parsedData)  // replaces current canvas
    }
  } catch (_) {}
}, [])
```

This is a flow-level import, not node-level clipboard copy. Pasting a Flowise JSON export into the browser window replaces the entire canvas — a crude but effective import UX.

**Port Recommendation: COPY-PATTERN (with guard)**  
**Confidence: MEDIUM**

Keep the JSON paste-to-import feature but add a confirmation dialog (Flowise skips this, which is destructive). For node-level copy/paste (copy selected nodes → paste as duplicates), smartbot-v2 must implement this separately — Flowise doesn't have it.

### Duplicate Flow (Tab-Based)

**File:** `CanvasHeader.jsx` lines ~290-320

```js
const handleDuplicateFlow = () => {
  localStorage.setItem('duplicatedFlowData', JSON.stringify({
    nodes: reactFlowInstance.getNodes(),
    edges: reactFlowInstance.getEdges(),
    name: `${chatflow.name} (Copy)`
  }))
  window.open('/canvas', '_blank')  // new tab picks up localStorage
}
```

The new tab's canvas init code checks `localStorage.getItem('duplicatedFlowData')` on mount and pre-populates the canvas, then saves as a new flow.

**Port Recommendation: SKIP (use API instead)**  
**Confidence: HIGH**

This is a hack. smartbot-v2 should implement `POST /flows/:id/duplicate` API endpoint that creates a proper server-side copy and redirects to the new canvas.

### Duplicate Node (Single Node)

**File:** `ReactFlowContext.jsx` — `duplicateNode` function

```js
const duplicateNode = (id, distance = 50) => {
  const node = reactFlowInstance.getNode(id)
  const newId = getUniqueNodeId(node.data, reactFlowInstance.getNodes())
  const newNode = cloneDeep(node)  // lodash deep clone

  newNode.id = newId
  newNode.data.id = newId
  newNode.position = {
    x: node.position.x + node.width + 50,
    y: node.position.y
  }

  // Remap handle IDs (old nodeId → new nodeId in handle strings)
  newNode.data.inputAnchors = newNode.data.inputAnchors.map(anchor => ({
    ...anchor,
    id: anchor.id.replace(id, newId)
  }))
  newNode.data.outputAnchors = newNode.data.outputAnchors.map(anchor => ({
    ...anchor,
    id: anchor.id.replace(id, newId)
  }))

  // Clear variable references ({{oldNodeId.data.instance}} → '')
  Object.keys(newNode.data.inputs).forEach(key => {
    const val = newNode.data.inputs[key]
    if (typeof val === 'string' && val.startsWith('{{')) {
      newNode.data.inputs[key] = ''
    }
  })

  setNodes((nds) => nds.concat(newNode))
  dispatch({ type: SET_DIRTY })
}
```

**Port Recommendation: COPY-PATTERN**  
**Confidence: HIGH**

The handle ID remapping and variable reference clearing are essential correctness details. Missing either causes silent bugs (duplicate node shares connections with original, or inherits stale variable references). Port this exactly, adapting `dispatch(SET_DIRTY)` to Zustand `setDirty(true)`.

---

## 7. Connection Validation

### Standard Connection Validation

**File:** `smart-agent/packages/ui/src/utils/genericHelper.js` — `isValidConnection`

```js
function isValidConnection(connection, reactFlowInstance) {
  const sourceHandle = connection.sourceHandle  // e.g. "node1-output-result-ChatModel"
  const targetHandle = connection.targetHandle  // e.g. "node2-input-llm-ChatModel"

  // Extract type from last '-' segment
  const sourceType = sourceHandle.split('-').pop()
  const targetType = targetHandle.split('-').pop()

  // Union types: "TypeA|TypeB"
  const sourceTypes = sourceType.split('|')
  const targetTypes = targetType.split('|')

  // Type compatibility check
  const compatible = sourceTypes.some(s => targetTypes.includes(s))
  if (!compatible) return false

  // Single-connection enforcement (unless list:true on target)
  const targetNode = reactFlowInstance.getNode(connection.target)
  const targetParam = targetNode.data.inputAnchors.find(a => a.id === targetHandle)
  if (!targetParam?.list) {
    const existingEdge = reactFlowInstance.getEdges().find(
      e => e.target === connection.target && e.targetHandle === targetHandle
    )
    if (existingEdge) return false
  }

  return true
}
```

Handle ID encoding: `{nodeId}-{direction}-{paramName}-{type}`. Type is always the last dash-segment. Union types use `|` separator.

### AgentflowV2 Connection Validation (DAG enforcement)

**File:** `genericHelper.js` — `isValidConnectionAgentflowV2` + `wouldCreateCycle`

```js
function wouldCreateCycle(sourceId, targetId, rf) {
  const edges = rf.getEdges()
  // Build adjacency list
  const adj = {}
  edges.forEach(e => {
    if (!adj[e.source]) adj[e.source] = []
    adj[e.source].push(e.target)
  })
  // BFS from targetId — if we can reach sourceId, adding this edge creates a cycle
  const queue = [targetId]
  const visited = new Set()
  while (queue.length) {
    const node = queue.shift()
    if (node === sourceId) return true
    if (visited.has(node)) continue
    visited.add(node)
    ;(adj[node] || []).forEach(n => queue.push(n))
  }
  return false
}

function isValidConnectionAgentflowV2(connection, rf) {
  if (connection.source === connection.target) return false  // no self-loops
  if (wouldCreateCycle(connection.source, connection.target, rf)) return false
  return true
}
```

**Port Recommendation: COPY-PATTERN (both validators)**  
**Confidence: HIGH**

The type-encoding in handle IDs is elegant — no separate lookup table needed. The BFS cycle check is O(V+E) and correct for DAG enforcement. Port both. For smartbot-v2, the `isValidConnectionAgentflowV2` variant is likely the primary validator (agent flows are DAGs).

### ButtonEdge (Delete Button on Edge)

**File:** `smart-agent/packages/ui/src/views/canvas/ButtonEdge.jsx` lines 1-79

```jsx
export default function ButtonEdge({ id, sourceX, sourceY, targetX, targetY, ... }) {
  const [edgeCenterX, edgeCenterY] = getBezierPath({ sourceX, sourceY, targetX, targetY })
  const { deleteEdge } = useContext(flowContext)

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        <foreignObject
          x={edgeCenterX - 10} y={edgeCenterY - 10}
          width={20} height={20}
        >
          <button onClick={(e) => { e.stopPropagation(); deleteEdge(id) }}>×</button>
        </foreignObject>
      </EdgeLabelRenderer>
    </>
  )
}
```

**v11 → v12 change:** `EdgeText` component removed in v12. Flowise uses `EdgeLabelRenderer` + `foreignObject` which still exists in v12. `getBezierPath` return signature unchanged. This edge component is v12-compatible with zero changes.

**Port Recommendation: COPY-PATTERN**  
**Confidence: HIGH**

---

## Node Palette (AddNodes)

**File:** `smart-agent/packages/ui/src/views/canvas/AddNodes.jsx` (770 lines)

### Fuzzy Search Scoring

```js
function fuzzyMatch(text, pattern) {
  // Scores: exact match=1000, word boundary bonus=100, consecutive=10, length penalty
  let score = 0
  let textIdx = 0
  let consecutive = 0
  for (let pi = 0; pi < pattern.length; pi++) {
    const char = pattern[pi].toLowerCase()
    while (textIdx < text.length && text[textIdx].toLowerCase() !== char) textIdx++
    if (textIdx >= text.length) return -1  // no match
    // Bonuses...
    score += (textIdx === 0 || text[textIdx-1] === ' ') ? 100 : 0
    score += consecutive * 10
    consecutive++
    textIdx++
  }
  score -= text.length  // length penalty
  return score
}
```

Search targets: node label, node description, node category. Results sorted by score descending.

**Port Recommendation: RE-INVENT with cmdk**  
**Confidence: HIGH**

`cmdk` (Command Menu) is the standard in shadcn/ui ecosystem and handles fuzzy search, keyboard navigation, and grouping out of the box. Replace Flowise's custom Popper + fuzzy scorer with `<CommandDialog>` or an inline `<Command>` component. Simpler, better UX.

### Category Grouping

Nodes grouped by `node.category` using MUI Accordion. Each accordion section is collapsible. Category blacklists filter nodes per canvas type (agent vs chatflow).

**Port Recommendation: COPY-PATTERN (grouping logic), RE-INVENT (accordion → cmdk groups)**

---

## Confirm Dialog Pattern

**File:** `smart-agent/packages/ui/src/hooks/useConfirm.jsx` (37 lines)

```js
let resolveCallback  // module-level, NOT state

export function useConfirm() {
  const { dispatch } = useContext(ConfirmContext)

  const confirm = (payload) => {
    dispatch({ type: 'SHOW_CONFIRM', payload })
    return new Promise(resolve => {
      resolveCallback = resolve  // capture resolver
    })
  }

  const onConfirm = () => {
    dispatch({ type: 'HIDE_CONFIRM' })
    resolveCallback(true)
  }

  const onCancel = () => {
    dispatch({ type: 'HIDE_CONFIRM' })
    resolveCallback(false)
  }

  return { confirm, onConfirm, onCancel }
}

// Usage:
const proceed = await confirm({ title: 'Delete node?', description: '...' })
if (proceed) deleteNode(id)
```

Module-level `resolveCallback` means only one confirm dialog can be active at a time. This is intentional.

**Port Recommendation: COPY-PATTERN**  
**Confidence: HIGH**

The promise-based confirm is idiomatic and eliminates callback nesting. Replace MUI dialog internals with shadcn `<AlertDialog>`.

---

## Stale Flow Detection (Save Guard)

**File:** `CanvasHeader.jsx` lines ~245-270

Before saving an existing flow, Flowise calls `GET /api/v1/chatflows/{id}/hasChatflowChanged`. If the server version differs from local (another user/tab saved), it shows a confirm before overwriting.

**Port Recommendation: COPY-PATTERN (optimistic with guard)**  
**Confidence: MEDIUM**

For single-user MVP, skip the stale check. Add for multi-user scenarios.

---

## React Flow v11 → v12 API Change Summary

| v11 API | v12 API | File:Line | Impact |
|---------|---------|-----------|--------|
| `reactFlowInstance.project(xy)` | `reactFlowInstance.screenToFlowPosition(xy)` | `index.jsx:287` | **BREAKING** — must rename on port |
| `EdgeText` component | Removed — use `EdgeLabelRenderer` | `ButtonEdge.jsx` | Already uses `EdgeLabelRenderer`, no change |
| `useHistory()` (unofficial) | `useUndoRedo()` (official) | N/A — not used | Must implement fresh |
| `getBezierPath` return type | Same — still returns `[path, cx, cy, ox, oy]` | `ButtonEdge.jsx:30` | No change |
| `deleteKeyCode` prop | Still valid in v12 | `index.jsx:362` | No change |
| `useNodesState`, `useEdgesState` | Same API | `index.jsx:90` | No change |

---

## Top 5 Patterns Ranked by Implementation Impact

1. **`initNode()` + handle ID encoding** (`genericHelper.js:120-200`)
   - Foundational. Everything downstream (connection validation, duplication, display) depends on `inputAnchors` vs `inputParams` split and `{nodeId}-{dir}-{name}-{type}` handle format. Implement first, before any canvas work.

2. **`canvasDialogShow` / dialog-suppresses-delete-key** (`canvasReducer.js` + `index.jsx:362`)
   - Simple but critical UX safety net. Easy to implement, catastrophic if missed (users lose work). Zustand equivalent: `dialogDepth: number`, increment/decrement per dialog open/close. Delete key disabled when `dialogDepth > 0`.

3. **`isValidConnection` + `wouldCreateCycle`** (`genericHelper.js:250-340`)
   - Type safety and DAG enforcement. Without this, users can create invalid or circular flows that crash execution. Port directly. The handle ID encoding makes this self-contained.

4. **`duplicateNode` handle remapping + variable clearing** (`ReactFlowContext.jsx`)
   - Silent correctness bug if missed. Duplicated nodes that share handle IDs with originals will steal connections. Variable references pointing to wrong nodes cause runtime errors.

5. **Promise-based `useConfirm`** (`useConfirm.jsx`)
   - DX pattern used everywhere. Dramatically simplifies all destructive operation UX. Replace MUI dialog with shadcn `<AlertDialog>`. 37 lines — copy exactly.

---

## Unresolved Questions

1. **`useUndoRedo()` edge coverage**: RF v12 docs show `useUndoRedo` restoring node state — unclear if edge state (and therefore `node.data.inputs` variable references) is included in snapshots. Needs verification against RF v12 changelog and/or testing.

2. **Right panel vs inline config**: Decision needed before Phase 06 implementation begins. Inline (Flowise style) keeps canvas code simpler but limits config space. Right panel (VS Code style) requires panel state management but scales to complex nodes. This is a UX architecture decision, not a code decision.

3. **`acceptVariable` + Handle coexistence in shadcn layout**: In Flowise, RF Handles are absolutely positioned relative to the node card. In smartbot-v2 with a right-panel config approach, handles will be on the node card (left side) while config is in the panel. The Handle rendering for `acceptVariable` params needs a clear layout spec.

4. **AgentflowV2 vs standard canvas**: smartbot-v2's canvas type — are all flows DAGs (use `isValidConnectionAgentflowV2`) or do some allow cycles (use `isValidConnection`)? Determines which validator is default.

5. **`asyncOptions` credential reload**: The `reloadTimestamp` key trick forces `<AsyncDropdown>` to re-fetch after credential save. React 18 concurrent mode may cause issues with this key-based remount pattern — needs verification.

---

## Open Risks

- **MUI DataGrid for `datagrid` type**: No direct shadcn equivalent. TanStack Table requires significant custom implementation. If smartbot-v2 has nodes with datagrid params, this is a multi-day effort.
- **CodeMirror integration**: Both `code` and `json` types use CodeMirror. This is a heavy dependency (~120KB gzipped). Evaluate whether Monaco (already used in many dev tools) is preferable for consistency if smartbot-v2 has a code editor elsewhere.
- **lodash `cloneDeep`** in `duplicateNode`: Acceptable for small node data but can be slow for nodes with large `datagrid` or `json` blobs. Consider `structuredClone()` (native, no dependency) as drop-in replacement.

---

*Source files analyzed: 11 primary files, 2 utility files. All file:line citations verified against actual source reads.*
