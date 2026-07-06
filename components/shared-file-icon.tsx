"use client";

import { NodeIcon } from "./file-icon";

export function SharedFileIcon({
  type,
  mimeType,
  name,
  small = false,
}: {
  type: "folder" | "file";
  mimeType: string | null;
  name: string;
  small?: boolean;
}) {
  return <NodeIcon type={type} mimeType={mimeType} name={name} size={small ? 20 : 28} />;
}
