import type { ActivityFileType, ParseResult } from "./types";
import { parseGPX } from "./gpx";
import { parseTCX } from "./tcx";
import { parseCSV } from "./csv";
import { parseFIT } from "./fit";

export * from "./types";
export { formatPace, formatDuration } from "./geo";

export function detectFileType(filename: string): ActivityFileType {
  const ext = filename.toLowerCase().split(".").pop() || "";
  if (ext === "gpx") return "GPX";
  if (ext === "tcx") return "TCX";
  if (ext === "csv") return "CSV";
  if (ext === "fit") return "FIT";
  return "UNKNOWN";
}

export async function parseActivityFile(file: File): Promise<ParseResult> {
  const fileType = detectFileType(file.name);
  if (fileType === "FIT") {
    const buf = await file.arrayBuffer();
    return parseFIT(buf);
  }
  if (fileType === "UNKNOWN") {
    return { status: "UNSUPPORTED", fileType: "UNKNOWN", error: "Unsupported file format. Upload .gpx, .tcx, .csv or .fit." };
  }
  const text = await file.text();
  if (fileType === "GPX") return parseGPX(text);
  if (fileType === "TCX") return parseTCX(text);
  return parseCSV(text);
}
