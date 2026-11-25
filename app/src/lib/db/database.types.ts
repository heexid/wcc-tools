export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      booking_counters: {
        Row: {
          last_value: number
          workspace_id: string
          year: number
        }
        Insert: {
          last_value?: number
          workspace_id?: string
          year: number
        }
        Update: {
          last_value?: number
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_counters_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_crew: {
        Row: {
          booking_id: string
          crew_id: string
          position: number
          workspace_id: string
        }
        Insert: {
          booking_id: string
          crew_id: string
          position?: number
          workspace_id?: string
        }
        Update: {
          booking_id?: string
          crew_id?: string
          position?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_crew_booking_id_fkey"
            columns: ["workspace_id", "booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "booking_crew_crew_id_fkey"
            columns: ["workspace_id", "crew_id"]
            isOneToOne: false
            referencedRelation: "crew"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "booking_crew_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_items: {
        Row: {
          booking_id: string
          id: string
          name: string
          position: number
          price: number
          qty: number
          workspace_id: string
        }
        Insert: {
          booking_id: string
          id?: string
          name: string
          position?: number
          price: number
          qty: number
          workspace_id?: string
        }
        Update: {
          booking_id?: string
          id?: string
          name?: string
          position?: number
          price?: number
          qty?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_items_booking_id_fkey"
            columns: ["workspace_id", "booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "booking_items_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          booking_name: string
          cancel_reason: string | null
          canceled_at: string | null
          canceled_by: string | null
          client_name: string
          client_phone: string
          created_at: string
          created_by: string | null
          event_start: string | null
          id: string
          location: string
          notes: string
          package_id: string
          package_name_snapshot: string
          package_price_snapshot: number
          payment_instruction: Json
          ref: string
          status: string
          terms: string
          total: number
          total_paid: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          booking_date: string
          booking_name?: string
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          created_by?: string | null
          event_start?: string | null
          id?: string
          location?: string
          notes?: string
          package_id: string
          package_name_snapshot: string
          package_price_snapshot: number
          payment_instruction: Json
          ref: string
          status?: string
          terms?: string
          total?: number
          total_paid?: number
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          booking_date?: string
          booking_name?: string
          cancel_reason?: string | null
          canceled_at?: string | null
          canceled_by?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          created_by?: string | null
          event_start?: string | null
          id?: string
          location?: string
          notes?: string
          package_id?: string
          package_name_snapshot?: string
          package_price_snapshot?: number
          payment_instruction?: Json
          ref?: string
          status?: string
          terms?: string
          total?: number
          total_paid?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_canceled_by_fkey"
            columns: ["workspace_id", "canceled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "bookings_created_by_fkey"
            columns: ["workspace_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "bookings_package_id_fkey"
            columns: ["workspace_id", "package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "bookings_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      crew: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          role?: string
          user_id?: string | null
          workspace_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          role?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_user_id_fkey"
            columns: ["workspace_id", "user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "crew_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          last_value: number
          workspace_id: string
          year: number
        }
        Insert: {
          last_value?: number
          workspace_id?: string
          year: number
        }
        Update: {
          last_value?: number
          workspace_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_counters_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          created_by: string | null
          dp_method: string | null
          dp_percentage: number | null
          id: string
          issued_at: string
          number: string
          pdf_path: string | null
          snapshot: Json
          snapshot_hash: string
          type: string
          void_reason: string | null
          voided_at: string | null
          workspace_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          created_by?: string | null
          dp_method?: string | null
          dp_percentage?: number | null
          id?: string
          issued_at?: string
          number: string
          pdf_path?: string | null
          snapshot: Json
          snapshot_hash: string
          type: string
          void_reason?: string | null
          voided_at?: string | null
          workspace_id?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          created_by?: string | null
          dp_method?: string | null
          dp_percentage?: number | null
          id?: string
          issued_at?: string
          number?: string
          pdf_path?: string | null
          snapshot?: Json
          snapshot_hash?: string
          type?: string
          void_reason?: string | null
          voided_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["workspace_id", "booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["workspace_id", "created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "invoices_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          price: number
          summary: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          price: number
          summary?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          summary?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "packages_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean
          created_at: string
          display_name: string
          id: string
          password_changed_at: string | null
          role: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          display_name: string
          id: string
          password_changed_at?: string | null
          role?: string
          updated_at?: string
          workspace_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          display_name?: string
          id?: string
          password_changed_at?: string | null
          role?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          business_address: string
          business_email: string
          business_logo_path: string | null
          business_name: string
          business_phone: string
          default_payment: Json | null
          default_terms: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          business_address: string
          business_email: string
          business_logo_path?: string | null
          business_name: string
          business_phone: string
          default_payment?: Json | null
          default_terms?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          business_address?: string
          business_email?: string
          business_logo_path?: string | null
          business_name?: string
          business_phone?: string
          default_payment?: Json | null
          default_terms?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_updated_by_fkey"
            columns: ["workspace_id", "updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "workspace_settings_workspace_fk"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          paid_until: string | null
          slug: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          paid_until?: string | null
          slug: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          paid_until?: string | null
          slug?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archive_package: { Args: { p_id: string }; Returns: undefined }
      below_paid_error: { Args: { p_booking_id: string }; Returns: undefined }
      booking_errors: { Args: { p: Json }; Returns: Json }
      booking_row: {
        Args: { b: Database["public"]["Tables"]["bookings"]["Row"] }
        Returns: Json
      }
      cancel_booking: {
        Args: { booking_id: string; reason?: string }
        Returns: Json
      }
      canonical_json: { Args: { v: Json }; Returns: string }
      count_bookings: { Args: never; Returns: number }
      create_invoice: {
        Args: {
          amount?: number
          booking_id: string
          dp_method?: string
          dp_value?: number
          type: string
        }
        Returns: Json
      }
      create_invoice_tx: {
        Args: {
          p_amount: number
          p_booking_id: string
          p_dp_method: string
          p_dp_value: number
          p_type: string
        }
        Returns: string
      }
      ensure_crew_entry: { Args: { p_user: string }; Returns: undefined }
      filter_bookings: { Args: { q: Json }; Returns: Json[] }
      get_booking: { Args: { p_id: string }; Returns: Json }
      get_crew_schedule: {
        Args: { p_crew_id: string; p_today: string }
        Returns: Json
      }
      get_invoice_snapshot: { Args: { p_id: string }; Returns: Json }
      get_kpis: { Args: { p_ym: string }; Returns: Json }
      get_settings: { Args: never; Returns: Json }
      invoice_amount: {
        Args: {
          p_amount: number
          p_canceled: boolean
          p_dp_method: string
          p_dp_value: number
          p_invoice_count: number
          p_total: number
          p_total_paid: number
          p_type: string
        }
        Returns: number
      }
      invoice_json: {
        Args: { i: Database["public"]["Tables"]["invoices"]["Row"] }
        Returns: Json
      }
      invoice_result: { Args: { p_invoice_id: string }; Returns: Json }
      is_admin: { Args: never; Returns: boolean }
      is_payment_instruction: { Args: { p: Json }; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      iso_utc: { Args: { t: string }; Returns: string }
      json_money: { Args: { v: Json }; Returns: number }
      like_escape: { Args: { p: string }; Returns: string }
      list_all_bookings: { Args: { q?: Json }; Returns: Json }
      list_bookings: { Args: { q?: Json }; Returns: Json }
      list_packages: {
        Args: { p_search?: string; p_tab?: string }
        Returns: Json
      }
      list_people: { Args: { p_today: string }; Returns: Json }
      mark_password_changed: { Args: never; Returns: undefined }
      my_profile: { Args: never; Returns: Json }
      next_booking_ref:
        | { Args: { p_workspace: string; p_year: number }; Returns: string }
        | { Args: { p_year: number }; Returns: string }
      next_invoice_number:
        | { Args: { p_workspace: string; p_year: number }; Returns: string }
        | { Args: { p_year: number }; Returns: string }
      normalize_phone: { Args: { p_input: string }; Returns: string }
      only_workspace: { Args: never; Returns: string }
      ordered_booking_ids: {
        Args: { q: Json }
        Returns: {
          id: string
          n: number
        }[]
      }
      package_row: {
        Args: { p: Database["public"]["Tables"]["packages"]["Row"] }
        Returns: Json
      }
      raise_code: {
        Args: { p_code: string; p_detail: string }
        Returns: undefined
      }
      require_admin: { Args: never; Returns: undefined }
      restore_package: { Args: { p_id: string }; Returns: undefined }
      save_booking: { Args: { payload: Json }; Returns: Json }
      save_booking_and_create_invoice: {
        Args: { booking: Json; invoice: Json }
        Returns: Json
      }
      save_booking_tx: { Args: { p: Json }; Returns: string }
      save_package: { Args: { p: Json }; Returns: Json }
      search_booking_ids: { Args: { p_search: string }; Returns: string[] }
      session_fresh: { Args: never; Returns: boolean }
      snapshot_hash: { Args: { v: Json }; Returns: string }
      staff_name: { Args: { p_id: string }; Returns: string }
      studio_year: { Args: never; Returns: number }
      try_date: { Args: { v: string }; Returns: string }
      try_num: { Args: { v: string }; Returns: number }
      try_uuid: { Args: { v: string }; Returns: string }
      update_business: { Args: { p: Json }; Returns: Json }
      update_display_name: { Args: { p_name: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

