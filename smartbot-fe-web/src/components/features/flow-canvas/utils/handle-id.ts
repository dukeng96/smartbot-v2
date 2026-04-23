export function encodeHandleId(
  nodeId: string,
  dir: "in" | "out",
  name: string,
  type: string
): string {
  return `${nodeId}__${dir}__${name}__${type}`
}

export interface DecodedHandle {
  nodeId: string
  dir: "in" | "out"
  name: string
  type: string
}

export function decodeHandleId(handleId: string): DecodedHandle {
  const parts = handleId.split("__")
  return {
    nodeId: parts[0] ?? "",
    dir: (parts[1] ?? "in") as "in" | "out",
    name: parts[2] ?? "",
    type: parts[3] ?? "any",
  }
}
