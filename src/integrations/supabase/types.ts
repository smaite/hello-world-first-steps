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
      bank_accounts: {
        Row: {
          account_number: string | null
          account_type: string | null
          bank_name: string
          created_at: string
          created_by: string | null
          current_balance: number
          id: string
          is_active: boolean
          name: string
          qr_code_url: string | null
          updated_at: string
        }
        Insert: {
          account_number?: string | null
          account_type?: string | null
          bank_name: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          id?: string
          is_active?: boolean
          name: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Update: {
          account_number?: string | null
          account_type?: string | null
          bank_name?: string
          created_at?: string
          created_by?: string | null
          current_balance?: number
          id?: string
          is_active?: boolean
          name?: string
          qr_code_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          amount: number
          bank_account_id: string
          created_at: string
          created_by: string | null
          credit_transaction_id: string | null
          id: string
          notes: string | null
          reference_number: string | null
          transaction_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id: string
          created_at?: string
          created_by?: string | null
          credit_transaction_id?: string | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string
          created_at?: string
          created_by?: string | null
          credit_transaction_id?: string | null
          id?: string
          notes?: string | null
          reference_number?: string | null
          transaction_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_credit_transaction_id_fkey"
            columns: ["credit_transaction_id"]
            isOneToOne: false
            referencedRelation: "credit_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_transaction_id: string | null
          staff_id: string
          transaction_type: string
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_transaction_id?: string | null
          staff_id: string
          transaction_type: string
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_transaction_id?: string | null
          staff_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credit_transactions_reference_transaction_id_fkey"
            columns: ["reference_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          credit_balance: number
          credit_limit: number
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          credit_balance?: number
          credit_limit?: number
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          credit_balance?: number
          credit_limit?: number
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      daily_reports: {
        Row: {
          created_at: string
          date: string
          id: string
          profit_loss: number
          staff_id: string
          total_credit_given: number
          total_credit_received: number
          total_inr_bought: number
          total_inr_sold: number
          total_npr_bought: number
          total_npr_sold: number
          total_transactions: number
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          profit_loss?: number
          staff_id: string
          total_credit_given?: number
          total_credit_received?: number
          total_inr_bought?: number
          total_inr_sold?: number
          total_npr_bought?: number
          total_npr_sold?: number
          total_transactions?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          profit_loss?: number
          staff_id?: string
          total_credit_given?: number
          total_credit_received?: number
          total_inr_bought?: number
          total_inr_sold?: number
          total_npr_bought?: number
          total_npr_sold?: number
          total_transactions?: number
        }
        Relationships: []
      }
      exchange_settings: {
        Row: {
          id: string
          inr_to_npr_rate: number
          npr_to_inr_rate: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          inr_to_npr_rate?: number
          npr_to_inr_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          inr_to_npr_rate?: number
          npr_to_inr_rate?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          currency: string
          description: string
          expense_date: string
          id: string
          notes: string | null
          receipt_url: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          category?: string
          created_at?: string
          currency?: string
          description: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          currency?: string
          description?: string
          expense_date?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      login_otps: {
        Row: {
          created_at: string
          created_by: string
          email: string
          expires_at: string
          id: string
          is_used: boolean
          otp_code: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          email: string
          expires_at?: string
          id?: string
          is_used?: boolean
          otp_code: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          otp_code?: string
          used_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agreement_url: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_document_url: string | null
          phone: string | null
          salary_agreement_url: string | null
          signed_agreement_url: string | null
          updated_at: string
        }
        Insert: {
          agreement_url?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          id_document_url?: string | null
          phone?: string | null
          salary_agreement_url?: string | null
          signed_agreement_url?: string | null
          updated_at?: string
        }
        Update: {
          agreement_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_document_url?: string | null
          phone?: string | null
          salary_agreement_url?: string | null
          signed_agreement_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      remembered_devices: {
        Row: {
          created_at: string
          device_name: string | null
          device_token: string
          expires_at: string
          id: string
          last_used_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_name?: string | null
          device_token: string
          expires_at?: string
          id?: string
          last_used_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_name?: string | null
          device_token?: string
          expires_at?: string
          id?: string
          last_used_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_cash_tracker: {
        Row: {
          closed_at: string | null
          closing_inr: number | null
          closing_npr: number | null
          created_at: string
          date: string
          id: string
          is_closed: boolean
          notes: string | null
          opening_inr: number
          opening_npr: number
          staff_id: string
          total_inr_in: number
          total_inr_out: number
          total_npr_in: number
          total_npr_out: number
        }
        Insert: {
          closed_at?: string | null
          closing_inr?: number | null
          closing_npr?: number | null
          created_at?: string
          date?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          opening_inr?: number
          opening_npr?: number
          staff_id: string
          total_inr_in?: number
          total_inr_out?: number
          total_npr_in?: number
          total_npr_out?: number
        }
        Update: {
          closed_at?: string | null
          closing_inr?: number | null
          closing_npr?: number | null
          created_at?: string
          date?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          opening_inr?: number
          opening_npr?: number
          staff_id?: string
          total_inr_in?: number
          total_inr_out?: number
          total_npr_in?: number
          total_npr_out?: number
        }
        Relationships: []
      }
      staff_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          permission_id: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_id: string
          staff_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          permission_id?: string
          staff_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_salaries: {
        Row: {
          base_salary: number
          bonus: number
          created_at: string
          deductions: number
          id: string
          is_paid: boolean
          month_year: string
          net_amount: number
          notes: string | null
          paid_by: string | null
          payment_date: string | null
          staff_id: string
          updated_at: string
        }
        Insert: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          id?: string
          is_paid?: boolean
          month_year: string
          net_amount?: number
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          staff_id: string
          updated_at?: string
        }
        Update: {
          base_salary?: number
          bonus?: number
          created_at?: string
          deductions?: number
          id?: string
          is_paid?: boolean
          month_year?: string
          net_amount?: number
          notes?: string | null
          paid_by?: string | null
          payment_date?: string | null
          staff_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      staff_settlements: {
        Row: {
          created_at: string
          date: string
          id: string
          inr_amount: number
          notes: string | null
          npr_amount: number
          settled_by: string
          staff_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          id?: string
          inr_amount?: number
          notes?: string | null
          npr_amount?: number
          settled_by: string
          staff_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          inr_amount?: number
          notes?: string | null
          npr_amount?: number
          settled_by?: string
          staff_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          created_at: string
          day_end_hour: number
          day_end_minute: number
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_end_hour?: number
          day_end_minute?: number
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_end_hour?: number
          day_end_minute?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          bank_account_id: string | null
          created_at: string
          customer_id: string | null
          exchange_rate: number
          from_amount: number
          from_currency: Database["public"]["Enums"]["currency_type"]
          id: string
          invoice_number: string | null
          is_credit: boolean
          is_personal_account: boolean
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          staff_id: string
          to_amount: number
          to_currency: Database["public"]["Enums"]["currency_type"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          bank_account_id?: string | null
          created_at?: string
          customer_id?: string | null
          exchange_rate: number
          from_amount: number
          from_currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          invoice_number?: string | null
          is_credit?: boolean
          is_personal_account?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          staff_id: string
          to_amount: number
          to_currency: Database["public"]["Enums"]["currency_type"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          bank_account_id?: string | null
          created_at?: string
          customer_id?: string | null
          exchange_rate?: number
          from_amount?: number
          from_currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          invoice_number?: string | null
          is_credit?: boolean
          is_personal_account?: boolean
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          staff_id?: string
          to_amount?: number
          to_currency?: Database["public"]["Enums"]["currency_type"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_staff_owes: {
        Args: { p_date: string; p_staff_id: string }
        Returns: {
          total_inr: number
          total_npr: number
        }[]
      }
      has_permission: { Args: { _permission_name: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_manager: { Args: never; Returns: boolean }
      is_owner: { Args: never; Returns: boolean }
      is_pending: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "manager" | "staff" | "pending"
      currency_type: "NPR" | "INR"
      payment_method: "cash" | "online"
      transaction_type: "buy" | "sell" | "credit_given" | "credit_received"
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
      app_role: ["owner", "manager", "staff", "pending"],
      currency_type: ["NPR", "INR"],
      payment_method: ["cash", "online"],
      transaction_type: ["buy", "sell", "credit_given", "credit_received"],
    },
  },
} as const
