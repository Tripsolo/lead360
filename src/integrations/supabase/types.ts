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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      approved_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          created_at: string | null
          excel_schema: Json
          id: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          excel_schema: Json
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          excel_schema?: Json
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_analyses: {
        Row: {
          analyzed_at: string
          full_analysis: Json | null
          id: string
          insights: string | null
          lead_id: string
          project_id: string | null
          rating: string
          revisit_date_at_analysis: string | null
        }
        Insert: {
          analyzed_at?: string
          full_analysis?: Json | null
          id?: string
          insights?: string | null
          lead_id: string
          project_id?: string | null
          rating: string
          revisit_date_at_analysis?: string | null
        }
        Update: {
          analyzed_at?: string
          full_analysis?: Json | null
          id?: string
          insights?: string | null
          lead_id?: string
          project_id?: string | null
          rating?: string
          revisit_date_at_analysis?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_analyses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_enrichments: {
        Row: {
          active_emi_burden: number | null
          active_loans: number | null
          age: number | null
          auto_loan_count: number | null
          auto_loans: number | null
          business_type: string | null
          consumer_loan_count: number | null
          created_at: string
          credit_behavior_signal: string | null
          credit_card_count: number | null
          credit_score: number | null
          designation: string | null
          emi_to_income_ratio: number | null
          employer_name: string | null
          enriched_at: string
          final_income_lacs: number | null
          gender: string | null
          guarantor_loan_count: number | null
          has_premium_cards: boolean | null
          highest_card_usage_percent: number | null
          home_loan_active: number | null
          home_loan_count: number | null
          home_loan_paid_off: number | null
          home_loans: number | null
          id: string
          industry: string | null
          is_amex_holder: boolean | null
          latest_home_loan_date: string | null
          lead_id: string
          lifestyle: string | null
          locality_grade: string | null
          location: string | null
          mql_capability: string | null
          mql_lifestyle: string | null
          mql_rating: string | null
          pre_tax_income_lacs: number | null
          project_id: string | null
          raw_response: Json | null
          total_loans: number | null
          turnover_slab: string | null
          updated_at: string
        }
        Insert: {
          active_emi_burden?: number | null
          active_loans?: number | null
          age?: number | null
          auto_loan_count?: number | null
          auto_loans?: number | null
          business_type?: string | null
          consumer_loan_count?: number | null
          created_at?: string
          credit_behavior_signal?: string | null
          credit_card_count?: number | null
          credit_score?: number | null
          designation?: string | null
          emi_to_income_ratio?: number | null
          employer_name?: string | null
          enriched_at?: string
          final_income_lacs?: number | null
          gender?: string | null
          guarantor_loan_count?: number | null
          has_premium_cards?: boolean | null
          highest_card_usage_percent?: number | null
          home_loan_active?: number | null
          home_loan_count?: number | null
          home_loan_paid_off?: number | null
          home_loans?: number | null
          id?: string
          industry?: string | null
          is_amex_holder?: boolean | null
          latest_home_loan_date?: string | null
          lead_id: string
          lifestyle?: string | null
          locality_grade?: string | null
          location?: string | null
          mql_capability?: string | null
          mql_lifestyle?: string | null
          mql_rating?: string | null
          pre_tax_income_lacs?: number | null
          project_id?: string | null
          raw_response?: Json | null
          total_loans?: number | null
          turnover_slab?: string | null
          updated_at?: string
        }
        Update: {
          active_emi_burden?: number | null
          active_loans?: number | null
          age?: number | null
          auto_loan_count?: number | null
          auto_loans?: number | null
          business_type?: string | null
          consumer_loan_count?: number | null
          created_at?: string
          credit_behavior_signal?: string | null
          credit_card_count?: number | null
          credit_score?: number | null
          designation?: string | null
          emi_to_income_ratio?: number | null
          employer_name?: string | null
          enriched_at?: string
          final_income_lacs?: number | null
          gender?: string | null
          guarantor_loan_count?: number | null
          has_premium_cards?: boolean | null
          highest_card_usage_percent?: number | null
          home_loan_active?: number | null
          home_loan_count?: number | null
          home_loan_paid_off?: number | null
          home_loans?: number | null
          id?: string
          industry?: string | null
          is_amex_holder?: boolean | null
          latest_home_loan_date?: string | null
          lead_id?: string
          lifestyle?: string | null
          locality_grade?: string | null
          location?: string | null
          mql_capability?: string | null
          mql_lifestyle?: string | null
          mql_rating?: string | null
          pre_tax_income_lacs?: number | null
          project_id?: string | null
          raw_response?: Json | null
          total_loans?: number | null
          turnover_slab?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          created_at: string
          crm_data: Json
          id: string
          latest_revisit_date: string | null
          lead_id: string
          project_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          crm_data: Json
          id?: string
          latest_revisit_date?: string | null
          lead_id: string
          project_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          crm_data?: Json
          id?: string
          latest_revisit_date?: string | null
          lead_id?: string
          project_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          name: string
          updated_at: string | null
        }
        Insert: {
          brand_id?: string | null
          created_at?: string | null
          id: string
          metadata?: Json | null
          name: string
          updated_at?: string | null
        }
        Update: {
          brand_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_approved_domain_user: { Args: never; Returns: boolean }
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
  public: {
    Enums: {},
  },
} as const
