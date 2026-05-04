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
      badges: {
        Row: {
          badge_image: string | null
          badge_name: string
          category: string | null
          created_at: string
          earned_date: string
          id: string
          user_id: string
        }
        Insert: {
          badge_image?: string | null
          badge_name: string
          category?: string | null
          created_at?: string
          earned_date?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_image?: string | null
          badge_name?: string
          category?: string | null
          created_at?: string
          earned_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenge_text: string
          completed_date: string | null
          created_at: string
          id: string
          location: string | null
          reward_badge: string | null
          status: Database["public"]["Enums"]["challenge_status"]
          user_id: string
        }
        Insert: {
          challenge_text: string
          completed_date?: string | null
          created_at?: string
          id?: string
          location?: string | null
          reward_badge?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          user_id: string
        }
        Update: {
          challenge_text?: string
          completed_date?: string | null
          created_at?: string
          id?: string
          location?: string | null
          reward_badge?: string | null
          status?: Database["public"]["Enums"]["challenge_status"]
          user_id?: string
        }
        Relationships: []
      }
      check_ins: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          location_name: string
          longitude: number | null
          notes: string | null
          photo: string | null
          timestamp: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          location_name: string
          longitude?: number | null
          notes?: string | null
          photo?: string | null
          timestamp?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          location_name?: string
          longitude?: number | null
          notes?: string | null
          photo?: string | null
          timestamp?: string
          user_id?: string
        }
        Relationships: []
      }
      checklists: {
        Row: {
          category: Database["public"]["Enums"]["checklist_category"]
          completed: boolean
          created_at: string
          due_date: string | null
          id: string
          item_name: string
          reminder: boolean
          trip_id: string | null
          user_id: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["checklist_category"]
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          item_name: string
          reminder?: boolean
          trip_id?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["checklist_category"]
          completed?: boolean
          created_at?: string
          due_date?: string | null
          id?: string
          item_name?: string
          reminder?: boolean
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklists_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_items: {
        Row: {
          activity: string
          created_at: string
          day_number: number
          description: string | null
          estimated_cost: number | null
          id: string
          location: string | null
          notes: string | null
          time: string | null
          time_block: string | null
          trip_id: string
          type: Database["public"]["Enums"]["itinerary_type"]
          user_id: string
        }
        Insert: {
          activity: string
          created_at?: string
          day_number: number
          description?: string | null
          estimated_cost?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          time?: string | null
          time_block?: string | null
          trip_id: string
          type?: Database["public"]["Enums"]["itinerary_type"]
          user_id: string
        }
        Update: {
          activity?: string
          created_at?: string
          day_number?: number
          description?: string | null
          estimated_cost?: number | null
          id?: string
          location?: string | null
          notes?: string | null
          time?: string | null
          time_block?: string | null
          trip_id?: string
          type?: Database["public"]["Enums"]["itinerary_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_items_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_interactions: {
        Row: {
          created_at: string
          id: string
          interaction_type: string
          offer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          interaction_type?: string
          offer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          interaction_type?: string
          offer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_interactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "partner_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_offers: {
        Row: {
          active: boolean
          address: string | null
          business_name: string
          category: Database["public"]["Enums"]["offer_category"]
          commission_rate: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          discount: string | null
          id: string
          image: string | null
          latitude: number | null
          longitude: number | null
          offer_description: string
          partner_id: string | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          business_name: string
          category?: Database["public"]["Enums"]["offer_category"]
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          discount?: string | null
          id?: string
          image?: string | null
          latitude?: number | null
          longitude?: number | null
          offer_description: string
          partner_id?: string | null
        }
        Update: {
          active?: boolean
          address?: string | null
          business_name?: string
          category?: Database["public"]["Enums"]["offer_category"]
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          discount?: string | null
          id?: string
          image?: string | null
          latitude?: number | null
          longitude?: number | null
          offer_description?: string
          partner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_offers_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          active: boolean
          address: string | null
          business_name: string
          category: Database["public"]["Enums"]["offer_category"]
          commission_rate: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          active?: boolean
          address?: string | null
          business_name: string
          category?: Database["public"]["Enums"]["offer_category"]
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          active?: boolean
          address?: string | null
          business_name?: string
          category?: Database["public"]["Enums"]["offer_category"]
          commission_rate?: number | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: []
      }
      places_visited: {
        Row: {
          city: string
          country: string
          created_at: string
          date_visited: string | null
          id: string
          latitude: number | null
          longitude: number | null
          photos_count: number
          trip_id: string | null
          user_id: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          date_visited?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photos_count?: number
          trip_id?: string | null
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          date_visited?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          photos_count?: number
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_visited_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          home_city: string | null
          id: string
          interests: string[] | null
          member_since: string
          name: string | null
          onboarding_completed: boolean
          profile_photo: string | null
          referral_code: string | null
          total_cities_visited: number
          total_countries_visited: number
          total_trips: number
          travel_style: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          home_city?: string | null
          id: string
          interests?: string[] | null
          member_since?: string
          name?: string | null
          onboarding_completed?: boolean
          profile_photo?: string | null
          referral_code?: string | null
          total_cities_visited?: number
          total_countries_visited?: number
          total_trips?: number
          travel_style?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          home_city?: string | null
          id?: string
          interests?: string[] | null
          member_since?: string
          name?: string | null
          onboarding_completed?: boolean
          profile_photo?: string | null
          referral_code?: string | null
          total_cities_visited?: number
          total_countries_visited?: number
          total_trips?: number
          travel_style?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          referred_email: string | null
          referred_id: string | null
          referrer_id: string
          reward_granted: boolean
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          referred_email?: string | null
          referred_id?: string | null
          referrer_id: string
          reward_granted?: boolean
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          referred_email?: string | null
          referred_id?: string | null
          referrer_id?: string
          reward_granted?: boolean
          status?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tier: Database["public"]["Enums"]["subscription_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tier?: Database["public"]["Enums"]["subscription_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trips: {
        Row: {
          budget: number | null
          created_at: string
          destination: string
          dietary: string | null
          end_date: string | null
          id: string
          interests: string[] | null
          pace: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["trip_status"]
          title: string
          travelers: number
          trip_style: Database["public"]["Enums"]["trip_style"] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget?: number | null
          created_at?: string
          destination: string
          dietary?: string | null
          end_date?: string | null
          id?: string
          interests?: string[] | null
          pace?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title: string
          travelers?: number
          trip_style?: Database["public"]["Enums"]["trip_style"] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget?: number | null
          created_at?: string
          destination?: string
          dietary?: string | null
          end_date?: string | null
          id?: string
          interests?: string[] | null
          pace?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["trip_status"]
          title?: string
          travelers?: number
          trip_style?: Database["public"]["Enums"]["trip_style"] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      nearby_offers: {
        Args: { lat: number; lng: number; radius_miles?: number }
        Returns: {
          active: boolean
          address: string | null
          business_name: string
          category: Database["public"]["Enums"]["offer_category"]
          commission_rate: number | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          discount: string | null
          id: string
          image: string | null
          latitude: number | null
          longitude: number | null
          offer_description: string
          partner_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "partner_offers"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      challenge_status: "active" | "completed" | "expired"
      checklist_category:
        | "packing"
        | "booking"
        | "documents"
        | "other"
        | "pre_trip_tasks"
        | "day_of"
      itinerary_type: "food" | "activity" | "transport" | "lodging"
      offer_category:
        | "food"
        | "activity"
        | "lodging"
        | "transport"
        | "shopping"
        | "other"
      subscription_tier: "free" | "plus" | "pro"
      trip_status: "planning" | "active" | "completed"
      trip_style: "solo" | "couple" | "family" | "friends" | "business"
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
      app_role: ["admin", "moderator", "user"],
      challenge_status: ["active", "completed", "expired"],
      checklist_category: [
        "packing",
        "booking",
        "documents",
        "other",
        "pre_trip_tasks",
        "day_of",
      ],
      itinerary_type: ["food", "activity", "transport", "lodging"],
      offer_category: [
        "food",
        "activity",
        "lodging",
        "transport",
        "shopping",
        "other",
      ],
      subscription_tier: ["free", "plus", "pro"],
      trip_status: ["planning", "active", "completed"],
      trip_style: ["solo", "couple", "family", "friends", "business"],
    },
  },
} as const
