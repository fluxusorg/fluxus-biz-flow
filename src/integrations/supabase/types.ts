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
      companies: {
        Row: {
          branch_addresses: string[] | null
          cnpj: string
          created_at: string
          headquarters_address: string | null
          id: string
          logo_url: string | null
          manager_name: string
          manager_position: string
          name: string
          updated_at: string
        }
        Insert: {
          branch_addresses?: string[] | null
          cnpj: string
          created_at?: string
          headquarters_address?: string | null
          id?: string
          logo_url?: string | null
          manager_name: string
          manager_position: string
          name: string
          updated_at?: string
        }
        Update: {
          branch_addresses?: string[] | null
          cnpj?: string
          created_at?: string
          headquarters_address?: string | null
          id?: string
          logo_url?: string | null
          manager_name?: string
          manager_position?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      material_records: {
        Row: {
          company_id: string
          created_at: string
          destination_supplier_id: string | null
          destination_type: string | null
          id: string
          latitude: number | null
          longitude: number | null
          notes: string | null
          operation_type: string
          origin_supplier_id: string | null
          origin_type: string | null
          photo_url: string | null
          record_date: string
          user_id: string
          vehicle_brand: string | null
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_model: string | null
          vehicle_plate: string
        }
        Insert: {
          company_id: string
          created_at?: string
          destination_supplier_id?: string | null
          destination_type?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          operation_type: string
          origin_supplier_id?: string | null
          origin_type?: string | null
          photo_url?: string | null
          record_date?: string
          user_id: string
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate: string
        }
        Update: {
          company_id?: string
          created_at?: string
          destination_supplier_id?: string | null
          destination_type?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          notes?: string | null
          operation_type?: string
          origin_supplier_id?: string | null
          origin_type?: string | null
          photo_url?: string | null
          record_date?: string
          user_id?: string
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "material_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_records_destination_supplier_id_fkey"
            columns: ["destination_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_records_origin_supplier_id_fkey"
            columns: ["origin_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_records_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_edit_requests: {
        Row: {
          company_id: string
          created_at: string
          id: string
          profile_id: string
          requested_changes: Json
          reviewed_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          profile_id: string
          requested_changes: Json
          reviewed_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          profile_id?: string
          requested_changes?: Json
          reviewed_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_edit_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_edit_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          full_name: string
          id: string
          operation_location: string | null
          photo_url: string | null
          position: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          full_name: string
          id: string
          operation_location?: string | null
          photo_url?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          full_name?: string
          id?: string
          operation_location?: string | null
          photo_url?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      record_cargos: {
        Row: {
          created_at: string
          description: string
          id: string
          quantity: number
          record_id: string
          stock_product_id: string | null
          unit: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          quantity?: number
          record_id: string
          stock_product_id?: string | null
          unit: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          quantity?: number
          record_id?: string
          stock_product_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "record_cargos_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "material_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "record_cargos_stock_product_id_fkey"
            columns: ["stock_product_id"]
            isOneToOne: false
            referencedRelation: "stock_products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_products: {
        Row: {
          company_id: string
          created_at: string
          current_quantity: number
          description: string | null
          id: string
          minimum_quantity: number | null
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          current_quantity?: number
          description?: string | null
          id?: string
          minimum_quantity?: number | null
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          current_quantity?: number
          description?: string | null
          id?: string
          minimum_quantity?: number | null
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          brand: string | null
          color: string | null
          company_id: string
          created_at: string
          id: string
          model: string | null
          plate: string
        }
        Insert: {
          brand?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          model?: string | null
          plate: string
        }
        Update: {
          brand?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          model?: string | null
          plate?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      is_master: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "master" | "employee"
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
      app_role: ["master", "employee"],
    },
  },
} as const
