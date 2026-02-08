export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            [key: string]: {
                Row: any
                Insert: any
                Update: any
                Relationships: any[]
            }
            unit_vehicles: {
                Row: {
                    id: string
                    unit_id: string
                    license_plate: string
                    is_primary: boolean | null
                    vehicle_type: string | null
                    created_at: string | null
                    updated_at: string | null
                    created_by: string | null
                }
                Insert: {
                    id?: string
                    unit_id: string
                    license_plate: string
                    is_primary?: boolean | null
                    vehicle_type?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                    created_by?: string | null
                }
                Update: {
                    id?: string
                    unit_id?: string
                    license_plate?: string
                    is_primary?: boolean | null
                    vehicle_type?: string | null
                    created_at?: string | null
                    updated_at?: string | null
                    created_by?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [key: string]: {
                Row: any
                Insert: any
                Update: any
                Relationships: any[]
            }
        }
        Functions: {
            [key: string]: {
                Args: any
                Returns: any
            }
        }
        Enums: {
            user_role: "admin" | "resident" | "security" | "developer"
        }
        CompositeTypes: {
            [key: string]: any
        }
    }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]
