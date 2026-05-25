import type { ParseResult } from "./types";

// FIT parsing is intentionally NOT implemented. We do not fake values.
// To enable, add a Worker-compatible FIT parser and replace this stub.
export function parseFIT(_buffer: ArrayBuffer): ParseResult {
  return {
    status: "UNSUPPORTED",
    fileType: "FIT",
    error:
      "FIT parsing is prepared but not enabled yet. Please upload GPX or TCX for now.",
  };
}
