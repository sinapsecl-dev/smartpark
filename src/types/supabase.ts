export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          id: string
          condominium_id: string
          booking_id: string | null
          user_id: string | null
          unit_id: string | null
          action: Database["public"]["Enums"]["audit_action"]
          license_plate: string | null
          spot_name: string | null
          gate_id: string | null
          ip_address: string | null
          user_agent: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          condominium_id: string
          booking_id?: string | null
          user_id?: string | null
          unit_id?: string | null
          action: Database["public"]["Enums"]["audit_action"]
          license_plate?: string | null
          spot_name?: string | null
          gate_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          condominium_id?: string
          booking_id?: string | null
          user_id?: string | null
          unit_id?: string | null
          action?: Database["public"]["Enums"]["audit_action"]
          license_plate?: string | null
          spot_name?: string | null
          gate_id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          id: string
          spot_id: string | null
          unit_id: string | null
          user_id: string | null
          condominium_id: string
          license_plate: string
          start_time: string
          end_time: string
          status: Database["public"]["Enums"]["booking_status"]
          report_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          spot_id?: string | null
          unit_id?: string | null
          user_id?: string | null
          condominium_id: string
          license_plate: string
          start_time: string
          end_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          report_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          spot_id?: string | null
          unit_id?: string | null
          user_id?: string | null
          condominium_id?: string
          license_plate?: string
          start_time?: string
          end_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          report_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      condominiums: {
        Row: {
          id: string
          name: string
          unique_code: string
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          max_parking_hours_per_week: number
          cooldown_period_hours: number
          max_booking_duration_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          unique_code: string
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          max_parking_hours_per_week?: number
          cooldown_period_hours?: number
          max_booking_duration_hours?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          unique_code?: string
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          max_parking_hours_per_week?: number
          cooldown_period_hours?: number
          max_booking_duration_hours?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_rules: {
        Row: {
          id: string
          rule_name: string
          rule_value: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          rule_name: string
          rule_value: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          rule_name?: string
          rule_value?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      infractions: {
        Row: {
          id: string
          booking_id: string | null
          reporter_user_id: string | null
          report_type: Database["public"]["Enums"]["infraction_report_type"]
          description: string | null
          status: Database["public"]["Enums"]["infraction_status"]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          booking_id?: string | null
          reporter_user_id?: string | null
          report_type: Database["public"]["Enums"]["infraction_report_type"]
          description?: string | null
          status?: Database["public"]["Enums"]["infraction_status"]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          booking_id?: string | null
          reporter_user_id?: string | null
          report_type?: Database["public"]["Enums"]["infraction_report_type"]
          description?: string | null
          status?: Database["public"]["Enums"]["infraction_status"]
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "infractions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infractions_reporter_user_id_fkey"
            columns: ["reporter_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_registrations: {
        Row: {
          id: string
          condominium_id: string
          email: string
          full_name: string | null
          phone: string | null
          requested_unit_name: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          status: Database["public"]["Enums"]["registration_status"]
          reviewed_by: string | null
          reviewed_at: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          condominium_id: string
          email: string
          full_name?: string | null
          phone?: string | null
          requested_unit_name?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          status?: Database["public"]["Enums"]["registration_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          condominium_id?: string
          email?: string
          full_name?: string | null
          phone?: string | null
          requested_unit_name?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          status?: Database["public"]["Enums"]["registration_status"]
          reviewed_by?: string | null
          reviewed_at?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_registrations_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      spots: {
        Row: {
          id: string
          name: string
          location_description: string | null
          condominium_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          location_description?: string | null
          condominium_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          location_description?: string | null
          condominium_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "spots_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          id: string
          name: string
          status: Database["public"]["Enums"]["unit_status"]
          weekly_quota_hours: number
          current_week_usage_minutes: number
          last_booking_end_time: string | null
          condominium_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          status?: Database["public"]["Enums"]["unit_status"]
          weekly_quota_hours?: number
          current_week_usage_minutes?: number
          last_booking_end_time?: string | null
          condominium_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          status?: Database["public"]["Enums"]["unit_status"]
          weekly_quota_hours?: number
          current_week_usage_minutes?: number
          last_booking_end_time?: string | null
          condominium_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          id: string
          unit_id: string | null
          email: string
          role: Database["public"]["Enums"]["user_role"]
          full_name: string | null
          phone: string | null
          user_type: Database["public"]["Enums"]["user_type"]
          status: Database["public"]["Enums"]["user_status"]
          condominium_id: string
          profile_completed: boolean
          invited_by: string | null
          invited_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          unit_id?: string | null
          email: string
          role?: Database["public"]["Enums"]["user_role"]
          full_name?: string | null
          phone?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          status?: Database["public"]["Enums"]["user_status"]
          condominium_id: string
          profile_completed?: boolean
          invited_by?: string | null
          invited_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string | null
          email?: string
          role?: Database["public"]["Enums"]["user_role"]
          full_name?: string | null
          phone?: string | null
          user_type?: Database["public"]["Enums"]["user_type"]
          status?: Database["public"]["Enums"]["user_status"]
          condominium_id?: string
          profile_completed?: boolean
          invited_by?: string | null
          invited_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "users_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_condominium_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_condominium_admin: {
        Args: {
          condo_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      audit_action:
      | "entry"
      | "exit"
      | "booking_created"
      | "booking_cancelled"
      | "booking_completed"
      | "check_in"
      | "check_out"
      | "denied"
      | "user_created"
      | "user_approved"
      | "user_suspended"
      booking_status:
      | "confirmed"
      | "active"
      | "completed"
      | "cancelled"
      | "reported"
      | "liberated"
      infraction_report_type: "exceeded_time" | "ghost_booking"
      infraction_status: "pending" | "resolved" | "false_positive"
      registration_status: "pending" | "approved" | "rejected"
      unit_status: "active" | "delinquent"
      user_role: "resident" | "admin"
      user_status: "pending" | "active" | "suspended"
      user_type: "owner" | "tenant"
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
      audit_action: [
        "entry",
        "exit",
        "booking_created",
        "booking_cancelled",
        "booking_completed",
        "check_in",
        "check_out",
        "denied",
        "user_created",
        "user_approved",
        "user_suspended",
      ],
      booking_status: [
        "confirmed",
        "active",
        "completed",
        "cancelled",
        "reported",
        "liberated",
      ],
      infraction_report_type: ["exceeded_time", "ghost_booking"],
      infraction_status: ["pending", "resolved", "false_positive"],
      registration_status: ["pending", "approved", "rejected"],
      unit_status: ["active", "delinquent"],
      user_role: ["resident", "admin"],
      user_status: ["pending", "active", "suspended"],
      user_type: ["owner", "tenant"],
    },
  },
} as const
