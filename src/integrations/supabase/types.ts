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
      completion_status: "FULL" | "PARTIAL" | "NONE"
      fatigue_level: "LOW" | "NORMAL" | "HIGH"
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
      completion_status: ["FULL", "PARTIAL", "NONE"],
      fatigue_level: ["LOW", "NORMAL", "HIGH"],
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
