export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_splits: {
        Row: {
          average_heart_rate: number | null
          average_pace_sec_per_km: number | null
          distance_meters: number
          duration_seconds: number
          elevation_gain_meters: number | null
          id: string
          imported_activity_id: string
          split_index: number
        }
        Insert: {
          average_heart_rate?: number | null
          average_pace_sec_per_km?: number | null
          distance_meters?: number
          duration_seconds?: number
          elevation_gain_meters?: number | null
          id?: string
          imported_activity_id: string
          split_index: number
        }
        Update: {
          average_heart_rate?: number | null
          average_pace_sec_per_km?: number | null
          distance_meters?: number
          duration_seconds?: number
          elevation_gain_meters?: number | null
          id?: string
          imported_activity_id?: string
          split_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_splits_imported_activity_id_fkey"
            columns: ["imported_activity_id"]
            isOneToOne: false
            referencedRelation: "imported_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_profiles: {
        Row: {
          age: number | null
          created_at: string
          cross_training_available: boolean | null
          current_level: Database["public"]["Enums"]["runner_level"] | null
          id: string
          name: string | null
          onboarded: boolean | null
          preferred_days: string[] | null
          race_date: string | null
          sessions_per_week: number | null
          target_10k_time: string | null
          updated_at: string
          user_id: string
          vma_kmh: number | null
        }
        Insert: {
          age?: number | null
          created_at?: string
          cross_training_available?: boolean | null
          current_level?: Database["public"]["Enums"]["runner_level"] | null
          id?: string
          name?: string | null
          onboarded?: boolean | null
          preferred_days?: string[] | null
          race_date?: string | null
          sessions_per_week?: number | null
          target_10k_time?: string | null
          updated_at?: string
          user_id: string
          vma_kmh?: number | null
        }
        Update: {
          age?: number | null
          created_at?: string
          cross_training_available?: boolean | null
          current_level?: Database["public"]["Enums"]["runner_level"] | null
          id?: string
          name?: string | null
          onboarded?: boolean | null
          preferred_days?: string[] | null
          race_date?: string | null
          sessions_per_week?: number | null
          target_10k_time?: string | null
          updated_at?: string
          user_id?: string
          vma_kmh?: number | null
        }
        Relationships: []
      }
      imported_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["activity_kind"]
          average_cadence: number | null
          average_heart_rate: number | null
          average_pace_sec_per_km: number | null
          average_speed_kmh: number | null
          calories: number | null
          created_at: string
          distance_meters: number
          duration_seconds: number
          elevation_gain_meters: number | null
          file_type: Database["public"]["Enums"]["activity_file_type"]
          id: string
          max_heart_rate: number | null
          moving_time_seconds: number | null
          original_filename: string | null
          raw_summary: Json | null
          source_type: Database["public"]["Enums"]["activity_source_type"]
          start_time: string
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type?: Database["public"]["Enums"]["activity_kind"]
          average_cadence?: number | null
          average_heart_rate?: number | null
          average_pace_sec_per_km?: number | null
          average_speed_kmh?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number
          duration_seconds?: number
          elevation_gain_meters?: number | null
          file_type?: Database["public"]["Enums"]["activity_file_type"]
          id?: string
          max_heart_rate?: number | null
          moving_time_seconds?: number | null
          original_filename?: string | null
          raw_summary?: Json | null
          source_type?: Database["public"]["Enums"]["activity_source_type"]
          start_time: string
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["activity_kind"]
          average_cadence?: number | null
          average_heart_rate?: number | null
          average_pace_sec_per_km?: number | null
          average_speed_kmh?: number | null
          calories?: number | null
          created_at?: string
          distance_meters?: number
          duration_seconds?: number
          elevation_gain_meters?: number | null
          file_type?: Database["public"]["Enums"]["activity_file_type"]
          id?: string
          max_heart_rate?: number | null
          moving_time_seconds?: number | null
          original_filename?: string | null
          raw_summary?: Json | null
          source_type?: Database["public"]["Enums"]["activity_source_type"]
          start_time?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      post_activity_feedback: {
        Row: {
          comment: string | null
          created_at: string
          fatigue_level: Database["public"]["Enums"]["fatigue_level"] | null
          id: string
          imported_activity_id: string
          pain_level: Database["public"]["Enums"]["pain_level"] | null
          rpe: number | null
          sleep_quality: Database["public"]["Enums"]["sleep_quality"] | null
          user_id: string
          workout_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          fatigue_level?: Database["public"]["Enums"]["fatigue_level"] | null
          id?: string
          imported_activity_id: string
          pain_level?: Database["public"]["Enums"]["pain_level"] | null
          rpe?: number | null
          sleep_quality?: Database["public"]["Enums"]["sleep_quality"] | null
          user_id: string
          workout_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          fatigue_level?: Database["public"]["Enums"]["fatigue_level"] | null
          id?: string
          imported_activity_id?: string
          pain_level?: Database["public"]["Enums"]["pain_level"] | null
          rpe?: number | null
          sleep_quality?: Database["public"]["Enums"]["sleep_quality"] | null
          user_id?: string
          workout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_activity_feedback_imported_activity_id_fkey"
            columns: ["imported_activity_id"]
            isOneToOne: false
            referencedRelation: "imported_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_activity_feedback_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      training_plans: {
        Row: {
          created_at: string
          current_week: number
          duration_weeks: number
          id: string
          name: string
          race_date: string
          start_date: string
          status: Database["public"]["Enums"]["plan_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          current_week?: number
          duration_weeks?: number
          id?: string
          name?: string
          race_date: string
          start_date: string
          status?: Database["public"]["Enums"]["plan_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          current_week?: number
          duration_weeks?: number
          id?: string
          name?: string
          race_date?: string
          start_date?: string
          status?: Database["public"]["Enums"]["plan_status"]
          user_id?: string
        }
        Relationships: []
      }
      uploaded_activity_files: {
        Row: {
          created_at: string
          file_size_bytes: number
          file_type: Database["public"]["Enums"]["activity_file_type"]
          id: string
          imported_activity_id: string | null
          original_filename: string
          parsing_error: string | null
          parsing_status: Database["public"]["Enums"]["file_parsing_status"]
          storage_path: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          file_size_bytes?: number
          file_type?: Database["public"]["Enums"]["activity_file_type"]
          id?: string
          imported_activity_id?: string | null
          original_filename: string
          parsing_error?: string | null
          parsing_status?: Database["public"]["Enums"]["file_parsing_status"]
          storage_path?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          file_size_bytes?: number
          file_type?: Database["public"]["Enums"]["activity_file_type"]
          id?: string
          imported_activity_id?: string | null
          original_filename?: string
          parsing_error?: string | null
          parsing_status?: Database["public"]["Enums"]["file_parsing_status"]
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_activity_files_imported_activity_id_fkey"
            columns: ["imported_activity_id"]
            isOneToOne: false
            referencedRelation: "imported_activities"
            referencedColumns: ["id"]
          },
        ]
      }
      vma_tests: {
        Row: {
          created_at: string
          date: string
          distance_meters: number | null
          duration_minutes: number | null
          estimated_vma_kmh: number | null
          id: string
          notes: string | null
          test_type: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          distance_meters?: number | null
          duration_minutes?: number | null
          estimated_vma_kmh?: number | null
          id?: string
          notes?: string | null
          test_type?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          distance_meters?: number | null
          duration_minutes?: number | null
          estimated_vma_kmh?: number | null
          id?: string
          notes?: string | null
          test_type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      workout_activity_matches: {
        Row: {
          confidence_score: number
          created_at: string
          distance_score: number
          id: string
          imported_activity_id: string
          intensity_score: number
          match_reason: string | null
          match_status: Database["public"]["Enums"]["match_status"]
          time_score: number
          type_score: number
          updated_at: string
          user_id: string
          workout_id: string
        }
        Insert: {
          confidence_score?: number
          created_at?: string
          distance_score?: number
          id?: string
          imported_activity_id: string
          intensity_score?: number
          match_reason?: string | null
          match_status?: Database["public"]["Enums"]["match_status"]
          time_score?: number
          type_score?: number
          updated_at?: string
          user_id: string
          workout_id: string
        }
        Update: {
          confidence_score?: number
          created_at?: string
          distance_score?: number
          id?: string
          imported_activity_id?: string
          intensity_score?: number
          match_reason?: string | null
          match_status?: Database["public"]["Enums"]["match_status"]
          time_score?: number
          type_score?: number
          updated_at?: string
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_activity_matches_imported_activity_id_fkey"
            columns: ["imported_activity_id"]
            isOneToOne: false
            referencedRelation: "imported_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_activity_matches_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_logs: {
        Row: {
          actual_distance_km: number | null
          actual_duration_minutes: number | null
          average_pace: string | null
          calculated_load: number | null
          comment: string | null
          completed_status: Database["public"]["Enums"]["completion_status"]
          created_at: string
          fatigue_level: Database["public"]["Enums"]["fatigue_level"] | null
          id: string
          pain_level: Database["public"]["Enums"]["pain_level"] | null
          rpe: number | null
          sleep_quality: Database["public"]["Enums"]["sleep_quality"] | null
          user_id: string
          workout_id: string
        }
        Insert: {
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          average_pace?: string | null
          calculated_load?: number | null
          comment?: string | null
          completed_status?: Database["public"]["Enums"]["completion_status"]
          created_at?: string
          fatigue_level?: Database["public"]["Enums"]["fatigue_level"] | null
          id?: string
          pain_level?: Database["public"]["Enums"]["pain_level"] | null
          rpe?: number | null
          sleep_quality?: Database["public"]["Enums"]["sleep_quality"] | null
          user_id: string
          workout_id: string
        }
        Update: {
          actual_distance_km?: number | null
          actual_duration_minutes?: number | null
          average_pace?: string | null
          calculated_load?: number | null
          comment?: string | null
          completed_status?: Database["public"]["Enums"]["completion_status"]
          created_at?: string
          fatigue_level?: Database["public"]["Enums"]["fatigue_level"] | null
          id?: string
          pain_level?: Database["public"]["Enums"]["pain_level"] | null
          rpe?: number | null
          sleep_quality?: Database["public"]["Enums"]["sleep_quality"] | null
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          cooldown: string | null
          created_at: string
          difficulty: number | null
          estimated_duration_minutes: number | null
          estimated_load: number | null
          id: string
          main_set: string | null
          notes: string | null
          objective: string | null
          plan_id: string
          recovery: string | null
          replaced_by_workout_id: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["workout_status"]
          target_pace_max: string | null
          target_pace_min: string | null
          target_vma_max_percent: number | null
          target_vma_min_percent: number | null
          title: string
          updated_at: string
          user_id: string
          warmup: string | null
          week_number: number
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Insert: {
          cooldown?: string | null
          created_at?: string
          difficulty?: number | null
          estimated_duration_minutes?: number | null
          estimated_load?: number | null
          id?: string
          main_set?: string | null
          notes?: string | null
          objective?: string | null
          plan_id: string
          recovery?: string | null
          replaced_by_workout_id?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["workout_status"]
          target_pace_max?: string | null
          target_pace_min?: string | null
          target_vma_max_percent?: number | null
          target_vma_min_percent?: number | null
          title: string
          updated_at?: string
          user_id: string
          warmup?: string | null
          week_number: number
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Update: {
          cooldown?: string | null
          created_at?: string
          difficulty?: number | null
          estimated_duration_minutes?: number | null
          estimated_load?: number | null
          id?: string
          main_set?: string | null
          notes?: string | null
          objective?: string | null
          plan_id?: string
          recovery?: string | null
          replaced_by_workout_id?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["workout_status"]
          target_pace_max?: string | null
          target_pace_min?: string | null
          target_vma_max_percent?: number | null
          target_vma_min_percent?: number | null
          title?: string
          updated_at?: string
          user_id?: string
          warmup?: string | null
          week_number?: number
          workout_type?: Database["public"]["Enums"]["workout_type"]
        }
        Relationships: [
          {
            foreignKeyName: "workouts_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "training_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_replaced_by_workout_id_fkey"
            columns: ["replaced_by_workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      activity_file_type: "FIT" | "GPX" | "TCX" | "CSV" | "UNKNOWN"
      activity_kind: "RUN" | "RIDE" | "WALK" | "STRENGTH" | "OTHER"
      activity_source_type: "FILE_UPLOAD" | "MANUAL_ENTRY"
      completion_status: "FULL" | "PARTIAL" | "NONE"
      fatigue_level: "LOW" | "NORMAL" | "HIGH"
      file_parsing_status: "PENDING" | "PARSED" | "FAILED" | "UNSUPPORTED"
      match_status:
        | "AUTO_MATCHED"
        | "MANUALLY_MATCHED"
        | "REJECTED"
        | "NEEDS_REVIEW"
      pain_level: "NONE" | "MILD" | "MODERATE" | "SEVERE"
      plan_status: "ACTIVE" | "COMPLETED" | "ARCHIVED"
      runner_level: "RETURNING" | "REGULAR" | "ADVANCED"
      sleep_quality: "GOOD" | "AVERAGE" | "POOR"
      workout_status:
        | "PLANNED"
        | "COMPLETED"
        | "PARTIAL"
        | "MISSED"
        | "RESCHEDULED"
        | "REPLACED"
      workout_type:
        | "VMA_SHORT"
        | "VMA_LONG"
        | "THRESHOLD"
        | "TEN_K_PACE"
        | "EASY"
        | "LONG_RUN"
        | "RECOVERY"
        | "HILLS"
        | "TEST"
        | "TAPER"
        | "RACE"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      activity_file_type: ["FIT", "GPX", "TCX", "CSV", "UNKNOWN"],
      activity_kind: ["RUN", "RIDE", "WALK", "STRENGTH", "OTHER"],
      activity_source_type: ["FILE_UPLOAD", "MANUAL_ENTRY"],
      completion_status: ["FULL", "PARTIAL", "NONE"],
      fatigue_level: ["LOW", "NORMAL", "HIGH"],
      file_parsing_status: ["PENDING", "PARSED", "FAILED", "UNSUPPORTED"],
      match_status: [
        "AUTO_MATCHED",
        "MANUALLY_MATCHED",
        "REJECTED",
        "NEEDS_REVIEW",
      ],
      pain_level: ["NONE", "MILD", "MODERATE", "SEVERE"],
      plan_status: ["ACTIVE", "COMPLETED", "ARCHIVED"],
      runner_level: ["RETURNING", "REGULAR", "ADVANCED"],
      sleep_quality: ["GOOD", "AVERAGE", "POOR"],
      workout_status: [
        "PLANNED",
        "COMPLETED",
        "PARTIAL",
        "MISSED",
        "RESCHEDULED",
        "REPLACED",
      ],
      workout_type: [
        "VMA_SHORT",
        "VMA_LONG",
        "THRESHOLD",
        "TEN_K_PACE",
        "EASY",
        "LONG_RUN",
        "RECOVERY",
        "HILLS",
        "TEST",
        "TAPER",
        "RACE",
      ],
    },
  },
} as const
