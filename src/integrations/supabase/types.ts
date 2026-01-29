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
      admin_permissions: {
        Row: {
          can_access_reports: boolean
          can_approve_settlements: boolean
          can_assign_orders: boolean
          can_manage_items: boolean
          can_manage_orders: boolean
          can_register_cooks: boolean
          can_register_delivery_staff: boolean
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          can_access_reports?: boolean
          can_approve_settlements?: boolean
          can_assign_orders?: boolean
          can_manage_items?: boolean
          can_manage_orders?: boolean
          can_register_cooks?: boolean
          can_register_delivery_staff?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          can_access_reports?: boolean
          can_approve_settlements?: boolean
          can_assign_orders?: boolean
          can_manage_items?: boolean
          can_manage_orders?: boolean
          can_register_cooks?: boolean
          can_register_delivery_staff?: boolean
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          display_order: number
          end_date: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          start_date: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          start_date?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          end_date?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          start_date?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          food_item_id: string
          id: string
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          food_item_id: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          food_item_id?: string
          id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      food_categories: {
        Row: {
          created_at: string
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
        }
        Relationships: []
      }
      food_item_images: {
        Row: {
          created_at: string
          display_order: number
          food_item_id: string
          id: string
          image_url: string
          is_primary: boolean
        }
        Insert: {
          created_at?: string
          display_order?: number
          food_item_id: string
          id?: string
          image_url: string
          is_primary?: boolean
        }
        Update: {
          created_at?: string
          display_order?: number
          food_item_id?: string
          id?: string
          image_url?: string
          is_primary?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "food_item_images_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_available: boolean
          is_vegetarian: boolean
          max_images: number
          min_images: number
          name: string
          panchayat_id: string | null
          preparation_time_minutes: number | null
          price: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_available?: boolean
          is_vegetarian?: boolean
          max_images?: number
          min_images?: number
          name: string
          panchayat_id?: string | null
          preparation_time_minutes?: number | null
          price: number
          service_type: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_available?: boolean
          is_vegetarian?: boolean
          max_images?: number
          min_images?: number
          name?: string
          panchayat_id?: string | null
          preparation_time_minutes?: number | null
          price?: number
          service_type?: Database["public"]["Enums"]["service_type"]
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "food_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "food_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_items_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_items_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          food_item_id: string
          id: string
          order_id: string
          quantity: number
          special_instructions: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          food_item_id: string
          id?: string
          order_id: string
          quantity?: number
          special_instructions?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          food_item_id?: string
          id?: string
          order_id?: string
          quantity?: number
          special_instructions?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_cook_id: string | null
          assigned_delivery_id: string | null
          created_at: string
          customer_id: string
          delivery_address: string | null
          delivery_instructions: string | null
          event_date: string | null
          event_details: string | null
          id: string
          order_number: string
          panchayat_id: string
          service_type: Database["public"]["Enums"]["service_type"]
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at: string
          ward_id: string
        }
        Insert: {
          assigned_cook_id?: string | null
          assigned_delivery_id?: string | null
          created_at?: string
          customer_id: string
          delivery_address?: string | null
          delivery_instructions?: string | null
          event_date?: string | null
          event_details?: string | null
          id?: string
          order_number: string
          panchayat_id: string
          service_type: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          updated_at?: string
          ward_id: string
        }
        Update: {
          assigned_cook_id?: string | null
          assigned_delivery_id?: string | null
          created_at?: string
          customer_id?: string
          delivery_address?: string | null
          delivery_instructions?: string | null
          event_date?: string | null
          event_details?: string | null
          id?: string
          order_number?: string
          panchayat_id?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          updated_at?: string
          ward_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      panchayats: {
        Row: {
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          is_active: boolean
          mobile_number: string
          name: string
          panchayat_id: string | null
          updated_at: string
          user_id: string
          ward_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mobile_number: string
          name: string
          panchayat_id?: string | null
          updated_at?: string
          user_id: string
          ward_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          mobile_number?: string
          name?: string
          panchayat_id?: string | null
          updated_at?: string
          user_id?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          order_id: string | null
          panchayat_id: string | null
          status: string
          updated_at: string
          user_id: string
          ward_id: string | null
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          panchayat_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          ward_id?: string | null
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          panchayat_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wards: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          panchayat_id: string
          updated_at: string
          ward_number: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          panchayat_id: string
          updated_at?: string
          ward_number?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          panchayat_id?: string
          updated_at?: string
          ward_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wards_panchayat_id_fkey"
            columns: ["panchayat_id"]
            isOneToOne: false
            referencedRelation: "panchayats"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "cook" | "delivery_staff" | "customer"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "out_for_delivery"
        | "delivered"
        | "cancelled"
      service_type: "indoor_events" | "cloud_kitchen" | "homemade"
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
      app_role: ["super_admin", "admin", "cook", "delivery_staff", "customer"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "cancelled",
      ],
      service_type: ["indoor_events", "cloud_kitchen", "homemade"],
    },
  },
} as const
