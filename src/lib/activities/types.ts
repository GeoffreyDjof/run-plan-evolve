export type ActivityFileType = "FIT" | "GPX" | "TCX" | "CSV" | "UNKNOWN";
export type ActivityKind = "RUN" | "RIDE" | "WALK" | "STRENGTH" | "OTHER";
export type ActivitySourceType = "FILE_UPLOAD" | "MANUAL_ENTRY";
export type FileParsingStatus = "PENDING" | "PARSED" | "FAILED" | "UNSUPPORTED";
export type MatchStatus = "AUTO_MATCHED" | "MANUALLY_MATCHED" | "REJECTED" | "NEEDS_REVIEW";

export interface ParsedSplit {
  split_index: number;
  distance_meters: number;
  duration_seconds: number;
  average_pace_sec_per_km?: number | null;
  average_heart_rate?: number | null;
  elevation_gain_meters?: number | null;
}

export interface ParsedActivity {
  activity_type: ActivityKind;
  start_time: string; // ISO
  timezone?: string | null;
  duration_seconds: number;
  moving_time_seconds?: number | null;
  distance_meters: number;
  average_pace_sec_per_km?: number | null;
  average_speed_kmh?: number | null;
  average_heart_rate?: number | null;
  max_heart_rate?: number | null;
  elevation_gain_meters?: number | null;
  average_cadence?: number | null;
  calories?: number | null;
  splits: ParsedSplit[];
  raw_summary?: Record<string, unknown> | null;
}

export interface ParseResult {
  status: FileParsingStatus;
  fileType: ActivityFileType;
  activity?: ParsedActivity;
  error?: string;
}
