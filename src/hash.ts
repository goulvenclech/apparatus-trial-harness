import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export function sha256Hex(data: string | Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

// Raw bytes, whitespace included: the archive must reflect exactly what was on disk.
export async function sha256HexOfFile(path: string): Promise<string> {
  return sha256Hex(await readFile(path));
}
