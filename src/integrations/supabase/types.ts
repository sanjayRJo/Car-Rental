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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          ip: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          ip?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: []
      }
      booking_inspections: {
        Row: {
          additional_charges: number
          booking_id: string
          created_at: string
          created_by: string | null
          damages: string | null
          exterior_condition: string | null
          fuel_level: number | null
          id: string
          interior_condition: string | null
          notes: string | null
          odometer: number | null
          phase: string
          photos: string[]
        }
        Insert: {
          additional_charges?: number
          booking_id: string
          created_at?: string
          created_by?: string | null
          damages?: string | null
          exterior_condition?: string | null
          fuel_level?: number | null
          id?: string
          interior_condition?: string | null
          notes?: string | null
          odometer?: number | null
          phase?: string
          photos?: string[]
        }
        Update: {
          additional_charges?: number
          booking_id?: string
          created_at?: string
          created_by?: string | null
          damages?: string | null
          exterior_condition?: string | null
          fuel_level?: number | null
          id?: string
          interior_condition?: string | null
          notes?: string | null
          odometer?: number | null
          phase?: string
          photos?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "booking_inspections_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_status_history: {
        Row: {
          booking_id: string
          changed_by: string | null
          created_at: string
          id: string
          note: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_id: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_id?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          note?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "booking_status_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          address: string | null
          base_amount: number
          booking_number: string
          cancelled_at: string | null
          car_id: string
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_amount: number
          drop_at: string
          drop_location_id: string | null
          emergency_contact: string | null
          id: string
          insurance_amount: number
          license_number: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_at: string
          pickup_location_id: string | null
          security_deposit: number
          status: Database["public"]["Enums"]["booking_status"]
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          base_amount?: number
          booking_number: string
          cancelled_at?: string | null
          car_id: string
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          drop_at: string
          drop_location_id?: string | null
          emergency_contact?: string | null
          id?: string
          insurance_amount?: number
          license_number?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_at: string
          pickup_location_id?: string | null
          security_deposit?: number
          status?: Database["public"]["Enums"]["booking_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          base_amount?: number
          booking_number?: string
          cancelled_at?: string | null
          car_id?: string
          completed_at?: string | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_amount?: number
          drop_at?: string
          drop_location_id?: string | null
          emergency_contact?: string | null
          id?: string
          insurance_amount?: number
          license_number?: string | null
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_at?: string
          pickup_location_id?: string | null
          security_deposit?: number
          status?: Database["public"]["Enums"]["booking_status"]
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_drop_location_id_fkey"
            columns: ["drop_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_pickup_location_id_fkey"
            columns: ["pickup_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      car_blocks: {
        Row: {
          car_id: string
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          kind: Database["public"]["Enums"]["block_kind"]
          reason: string | null
          starts_at: string
        }
        Insert: {
          car_id: string
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          kind?: Database["public"]["Enums"]["block_kind"]
          reason?: string | null
          starts_at: string
        }
        Update: {
          car_id?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["block_kind"]
          reason?: string | null
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "car_blocks_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      cars: {
        Row: {
          bookings_count: number
          brand: string
          car_type: Database["public"]["Enums"]["car_type"]
          color: string | null
          created_at: string
          daily_rate: number
          description: string | null
          features: string[]
          fuel: Database["public"]["Enums"]["fuel_type"]
          hourly_rate: number
          id: string
          images: string[]
          insurance_expiry: string | null
          location_id: string | null
          mileage: number | null
          model: string
          puc_expiry: string | null
          rating: number
          rc_expiry: string | null
          registration_number: string
          seats: number
          security_deposit: number
          slug: string
          status: Database["public"]["Enums"]["car_status"]
          transmission: Database["public"]["Enums"]["transmission_type"]
          updated_at: string
          variant: string | null
          vehicle_code: string
          weekly_rate: number
          year: number
        }
        Insert: {
          bookings_count?: number
          brand: string
          car_type?: Database["public"]["Enums"]["car_type"]
          color?: string | null
          created_at?: string
          daily_rate?: number
          description?: string | null
          features?: string[]
          fuel?: Database["public"]["Enums"]["fuel_type"]
          hourly_rate?: number
          id?: string
          images?: string[]
          insurance_expiry?: string | null
          location_id?: string | null
          mileage?: number | null
          model: string
          puc_expiry?: string | null
          rating?: number
          rc_expiry?: string | null
          registration_number: string
          seats?: number
          security_deposit?: number
          slug: string
          status?: Database["public"]["Enums"]["car_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          variant?: string | null
          vehicle_code: string
          weekly_rate?: number
          year: number
        }
        Update: {
          bookings_count?: number
          brand?: string
          car_type?: Database["public"]["Enums"]["car_type"]
          color?: string | null
          created_at?: string
          daily_rate?: number
          description?: string | null
          features?: string[]
          fuel?: Database["public"]["Enums"]["fuel_type"]
          hourly_rate?: number
          id?: string
          images?: string[]
          insurance_expiry?: string | null
          location_id?: string | null
          mileage?: number | null
          model?: string
          puc_expiry?: string | null
          rating?: number
          rc_expiry?: string | null
          registration_number?: string
          seats?: number
          security_deposit?: number
          slug?: string
          status?: Database["public"]["Enums"]["car_status"]
          transmission?: Database["public"]["Enums"]["transmission_type"]
          updated_at?: string
          variant?: string | null
          vehicle_code?: string
          weekly_rate?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "cars_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          city: string
          closing_time: string
          contact_number: string | null
          created_at: string
          id: string
          is_active: boolean
          latitude: number | null
          longitude: number | null
          name: string
          opening_time: string
          slug: string
          state: string
          updated_at: string
        }
        Insert: {
          address?: string
          city: string
          closing_time?: string
          contact_number?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          opening_time?: string
          slug: string
          state?: string
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          closing_time?: string
          contact_number?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          opening_time?: string
          slug?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          code: string
          created_at: string
          id: string
          is_active: boolean
          subject: string | null
        }
        Insert: {
          body: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject?: string | null
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          subject?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          booking_id: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivered_at: string | null
          error: string | null
          failed_at: string | null
          id: string
          recipient: string
          reminder_key: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_code: string
          user_id: string | null
        }
        Insert: {
          body?: string
          booking_id?: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          recipient: string
          reminder_key?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_code: string
          user_id?: string | null
        }
        Update: {
          body?: string
          booking_id?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivered_at?: string | null
          error?: string | null
          failed_at?: string | null
          id?: string
          recipient?: string
          reminder_key?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_code?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          address: string | null
          created_at: string
          email: string
          emergency_contact: string | null
          full_name: string
          id: string
          license_number: string | null
          phone: string | null
          status: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string
          emergency_contact?: string | null
          full_name?: string
          id: string
          license_number?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          emergency_contact?: string | null
          full_name?: string
          id?: string
          license_number?: string | null
          phone?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          author_name: string
          booking_id: string | null
          car_id: string
          comment: string | null
          created_at: string
          id: string
          is_published: boolean
          rating: number
          user_id: string | null
        }
        Insert: {
          author_name?: string
          booking_id?: string | null
          car_id: string
          comment?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          rating: number
          user_id?: string | null
        }
        Update: {
          author_name?: string
          booking_id?: string | null
          car_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          is_published?: boolean
          rating?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_car_id_fkey"
            columns: ["car_id"]
            isOneToOne: false
            referencedRelation: "cars"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_booking: {
        Args: {
          _address: string
          _base: number
          _car_id: string
          _customer_email: string
          _customer_name: string
          _customer_phone: string
          _deposit: number
          _discount: number
          _drop_at: string
          _drop_location_id: string
          _emergency_contact: string
          _insurance: number
          _license_number: string
          _pickup_at: string
          _pickup_location_id: string
          _tax: number
          _total: number
        }
        Returns: {
          address: string | null
          base_amount: number
          booking_number: string
          cancelled_at: string | null
          car_id: string
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_amount: number
          drop_at: string
          drop_location_id: string | null
          emergency_contact: string | null
          id: string
          insurance_amount: number
          license_number: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_at: string
          pickup_location_id: string | null
          security_deposit: number
          status: Database["public"]["Enums"]["booking_status"]
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      extend_booking: {
        Args: { _booking_id: string; _new_drop_at: string }
        Returns: {
          address: string | null
          base_amount: number
          booking_number: string
          cancelled_at: string | null
          car_id: string
          completed_at: string | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_amount: number
          drop_at: string
          drop_location_id: string | null
          emergency_contact: string | null
          id: string
          insurance_amount: number
          license_number: string | null
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_at: string
          pickup_location_id: string | null
          security_deposit: number
          status: Database["public"]["Enums"]["booking_status"]
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      get_busy_slots: {
        Args: { _from: string; _to: string }
        Returns: {
          car_id: string
          ends_at: string
          kind: string
          starts_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "customer"
        | "admin"
        | "super_admin"
        | "fleet_manager"
        | "support"
      block_kind: "maintenance" | "blocked"
      booking_status:
        | "pending"
        | "confirmed"
        | "ready_for_pickup"
        | "customer_arrived"
        | "picked_up"
        | "active"
        | "return_requested"
        | "returned"
        | "inspection"
        | "completed"
        | "cancelled"
        | "no_show"
        | "expired"
      car_status: "available" | "maintenance" | "blocked" | "inactive"
      car_type: "hatchback" | "sedan" | "suv" | "luxury" | "ev"
      fuel_type: "petrol" | "diesel" | "electric" | "hybrid"
      notification_channel: "email" | "whatsapp" | "sms" | "push"
      notification_status: "pending" | "sent" | "delivered" | "failed"
      payment_status:
        | "payment_pending"
        | "payment_success"
        | "payment_failed"
        | "payment_refunded"
      transmission_type: "manual" | "automatic"
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
      app_role: [
        "customer",
        "admin",
        "super_admin",
        "fleet_manager",
        "support",
      ],
      block_kind: ["maintenance", "blocked"],
      booking_status: [
        "pending",
        "confirmed",
        "ready_for_pickup",
        "customer_arrived",
        "picked_up",
        "active",
        "return_requested",
        "returned",
        "inspection",
        "completed",
        "cancelled",
        "no_show",
        "expired",
      ],
      car_status: ["available", "maintenance", "blocked", "inactive"],
      car_type: ["hatchback", "sedan", "suv", "luxury", "ev"],
      fuel_type: ["petrol", "diesel", "electric", "hybrid"],
      notification_channel: ["email", "whatsapp", "sms", "push"],
      notification_status: ["pending", "sent", "delivered", "failed"],
      payment_status: [
        "payment_pending",
        "payment_success",
        "payment_failed",
        "payment_refunded",
      ],
      transmission_type: ["manual", "automatic"],
    },
  },
} as const
