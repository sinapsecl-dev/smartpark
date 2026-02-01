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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"]
          booking_id: string | null
          condominium_id: string
          created_at: string
          gate_id: string | null
          id: string
          ip_address: string | null
          license_plate: string | null
          metadata: Json | null
          spot_name: string | null
          unit_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["audit_action"]
          booking_id?: string | null
          condominium_id: string
          created_at?: string
          gate_id?: string | null
          id?: string
          ip_address?: string | null
          license_plate?: string | null
          metadata?: Json | null
          spot_name?: string | null
          unit_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"]
          booking_id?: string | null
          condominium_id?: string
          created_at?: string
          gate_id?: string | null
          id?: string
          ip_address?: string | null
          license_plate?: string | null
          metadata?: Json | null
          spot_name?: string | null
          unit_id?: string | null
          user_agent?: string | null
          user_id?: string | null
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
          condominium_id: string
          created_at: string
          end_time: string
          id: string
          license_plate: string
          report_reason: string | null
          spot_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          unit_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          condominium_id: string
          created_at?: string
          end_time: string
          id?: string
          license_plate: string
          report_reason?: string | null
          spot_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          condominium_id?: string
          created_at?: string
          end_time?: string
          id?: string
          license_plate?: string
          report_reason?: string | null
          spot_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
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
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          cooldown_period_hours: number | null
          created_at: string
          id: string
          max_booking_duration_hours: number | null
          max_parking_hours_per_week: number | null
          name: string
          unique_code: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cooldown_period_hours?: number | null
          created_at?: string
          id?: string
          max_booking_duration_hours?: number | null
          max_parking_hours_per_week?: number | null
          name: string
          unique_code: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          cooldown_period_hours?: number | null
          created_at?: string
          id?: string
          max_booking_duration_hours?: number | null
          max_parking_hours_per_week?: number | null
          name?: string
          unique_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_rules: {
        Row: {
          condominium_id: string
          created_at: string
          description: string | null
          id: string
          rule_name: string
          rule_value: string
          updated_at: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          description?: string | null
          id?: string
          rule_name: string
          rule_value: string
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          description?: string | null
          id?: string
          rule_name?: string
          rule_value?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "config_rules_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
            referencedColumns: ["id"]
          },
        ]
      }
      infractions: {
        Row: {
          booking_id: string | null
          condominium_id: string
          created_at: string
          description: string | null
          id: string
          report_type: Database["public"]["Enums"]["infraction_report_type"]
          reporter_user_id: string | null
          status: Database["public"]["Enums"]["infraction_status"]
          updated_at: string
        }
        Insert: {
          booking_id?: string | null
          condominium_id: string
          created_at?: string
          description?: string | null
          id?: string
          report_type: Database["public"]["Enums"]["infraction_report_type"]
          reporter_user_id?: string | null
          status?: Database["public"]["Enums"]["infraction_status"]
          updated_at?: string
        }
        Update: {
          booking_id?: string | null
          condominium_id?: string
          created_at?: string
          description?: string | null
          id?: string
          report_type?: Database["public"]["Enums"]["infraction_report_type"]
          reporter_user_id?: string | null
          status?: Database["public"]["Enums"]["infraction_status"]
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
            foreignKeyName: "infractions_condominium_id_fkey"
            columns: ["condominium_id"]
            isOneToOne: false
            referencedRelation: "condominiums"
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
          condominium_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          notes: string | null
          phone: string | null
          requested_unit_name: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["registration_status"]
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          condominium_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          requested_unit_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          condominium_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          notes?: string | null
          phone?: string | null
          requested_unit_name?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["registration_status"]
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
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
          condominium_id: string
          created_at: string
          id: string
          location_description: string | null
          name: string
          updated_at: string
        }
        Insert: {
          condominium_id: string
          created_at?: string
          id?: string
          location_description?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          condominium_id?: string
          created_at?: string
          id?: string
          location_description?: string | null
          name?: string
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
          condominium_id: string
          created_at: string
          current_week_usage_minutes: number
          id: string
          last_booking_end_time: string | null
          name: string
          status: Database["public"]["Enums"]["unit_status"]
          updated_at: string
          weekly_quota_hours: number
        }
        Insert: {
          condominium_id: string
          created_at?: string
          current_week_usage_minutes?: number
          id?: string
          last_booking_end_time?: string | null
          name: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
          weekly_quota_hours?: number
        }
        Update: {
          condominium_id?: string
          created_at?: string
          current_week_usage_minutes?: number
          id?: string
          last_booking_end_time?: string | null
          name?: string
          status?: Database["public"]["Enums"]["unit_status"]
          updated_at?: string
          weekly_quota_hours?: number
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
          condominium_id: string
          created_at: string
          email: string
          full_name: string | null
          id: string
          invited_at: string | null
          invited_by: string | null
          phone: string | null
          profile_completed: boolean
          role: Database["public"]["Enums"]["user_role"]
          status: Database["public"]["Enums"]["user_status"]
          unit_id: string | null
          updated_at: string
          user_type: Database["public"]["Enums"]["user_type"]
        }
        Insert: {
          condominium_id: string
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          invited_at?: string | null
          invited_by?: string | null
          phone?: string | null
          profile_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          unit_id?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
        }
        Update: {
          condominium_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          phone?: string | null
          profile_completed?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          status?: Database["public"]["Enums"]["user_status"]
          unit_id?: string | null
          updated_at?: string
          user_type?: Database["public"]["Enums"]["user_type"]
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
      create_audit_log: {
        Args: {
          p_action_type: Database["public"]["Enums"]["audit_action"]
          p_entity_type: string
          p_entity_id: string
          p_details: Json
        }
        Returns: void
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
      | "user_reactivated"
      | "user_invited"
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

type PublicSchema = Database["public"]

export type Tables<
  TableName extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
> = (PublicSchema["Tables"] & PublicSchema["Views"])[TableName] extends {
  Row: infer R
}
  ? R
  : never

export type TablesInsert<
  TableName extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][TableName] extends {
  Insert: infer I
}
  ? I
  : never

export type TablesUpdate<
  TableName extends keyof PublicSchema["Tables"]
> = PublicSchema["Tables"][TableName] extends {
  Update: infer U
}
  ? U
  : never

export type Enums<
  EnumName extends keyof PublicSchema["Enums"]
> = PublicSchema["Enums"][EnumName]

export type CompositeTypes<
  CompositeTypeName extends keyof PublicSchema["CompositeTypes"]
> = PublicSchema["CompositeTypes"][CompositeTypeName]


