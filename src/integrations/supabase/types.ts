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
      announcements: {
        Row: {
          author_id: string | null
          body: string
          channel: Database["public"]["Enums"]["channel_code"] | null
          created_at: string
          id: string
          image_url: string | null
          pinned: boolean
          target: Database["public"]["Enums"]["announcement_target"]
          title: string
        }
        Insert: {
          author_id?: string | null
          body: string
          channel?: Database["public"]["Enums"]["channel_code"] | null
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          target?: Database["public"]["Enums"]["announcement_target"]
          title: string
        }
        Update: {
          author_id?: string | null
          body?: string
          channel?: Database["public"]["Enums"]["channel_code"] | null
          created_at?: string
          id?: string
          image_url?: string | null
          pinned?: boolean
          target?: Database["public"]["Enums"]["announcement_target"]
          title?: string
        }
        Relationships: []
      }
      channel_settings: {
        Row: {
          channel: Database["public"]["Enums"]["channel_code"]
          next_release_at: string
          release_interval_minutes: number
          updated_at: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["channel_code"]
          next_release_at?: string
          release_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_code"]
          next_release_at?: string
          release_interval_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      member_requests: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["request_kind"]
          last_message_at: string
          status: Database["public"]["Enums"]["request_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          last_message_at?: string
          status?: Database["public"]["Enums"]["request_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["request_kind"]
          last_message_at?: string
          status?: Database["public"]["Enums"]["request_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      predictions: {
        Row: {
          away_team: string
          channel: Database["public"]["Enums"]["channel_code"]
          confidence: number
          created_at: string
          home_team: string
          id: string
          kickoff_at: string
          league: string
          match_name: string
          odds: number | null
          prediction: string
          published: boolean
          release_at: string
          sport: string
          tier: Database["public"]["Enums"]["prediction_tier"]
        }
        Insert: {
          away_team: string
          channel: Database["public"]["Enums"]["channel_code"]
          confidence?: number
          created_at?: string
          home_team: string
          id?: string
          kickoff_at: string
          league: string
          match_name: string
          odds?: number | null
          prediction: string
          published?: boolean
          release_at?: string
          sport?: string
          tier?: Database["public"]["Enums"]["prediction_tier"]
        }
        Update: {
          away_team?: string
          channel?: Database["public"]["Enums"]["channel_code"]
          confidence?: number
          created_at?: string
          home_team?: string
          id?: string
          kickoff_at?: string
          league?: string
          match_name?: string
          odds?: number | null
          prediction?: string
          published?: boolean
          release_at?: string
          sport?: string
          tier?: Database["public"]["Enums"]["prediction_tier"]
        }
        Relationships: []
      }
      profiles: {
        Row: {
          channel: Database["public"]["Enums"]["channel_code"]
          created_at: string
          free_picks_claimed: number
          full_name: string
          id: string
          is_vip: boolean
          last_login: string | null
          last_seen_at: string
          status: Database["public"]["Enums"]["user_status"]
          tour_completed: boolean
          whatsapp: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["channel_code"]
          created_at?: string
          free_picks_claimed?: number
          full_name: string
          id: string
          is_vip?: boolean
          last_login?: string | null
          last_seen_at?: string
          status?: Database["public"]["Enums"]["user_status"]
          tour_completed?: boolean
          whatsapp: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["channel_code"]
          created_at?: string
          free_picks_claimed?: number
          full_name?: string
          id?: string
          is_vip?: boolean
          last_login?: string | null
          last_seen_at?: string
          status?: Database["public"]["Enums"]["user_status"]
          tour_completed?: boolean
          whatsapp?: string
        }
        Relationships: []
      }
      request_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          request_id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["message_sender_role"]
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          request_id: string
          sender_id: string
          sender_role: Database["public"]["Enums"]["message_sender_role"]
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          request_id?: string
          sender_id?: string
          sender_role?: Database["public"]["Enums"]["message_sender_role"]
        }
        Relationships: [
          {
            foreignKeyName: "request_messages_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "member_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          accent_color: string
          id: number
          logo_url: string | null
          primary_color: string
          site_name: string
          tagline: string
          updated_at: string
        }
        Insert: {
          accent_color?: string
          id?: number
          logo_url?: string | null
          primary_color?: string
          site_name?: string
          tagline?: string
          updated_at?: string
        }
        Update: {
          accent_color?: string
          id?: number
          logo_url?: string | null
          primary_color?: string
          site_name?: string
          tagline?: string
          updated_at?: string
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
    }
    Enums: {
      announcement_target: "all" | "A" | "B"
      app_role: "admin" | "user"
      channel_code: "A" | "B"
      message_sender_role: "member" | "admin"
      prediction_tier: "free" | "vip"
      request_kind: "upgrade" | "next_game" | "general"
      request_status: "open" | "answered" | "closed"
      user_status: "active" | "disabled"
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
      announcement_target: ["all", "A", "B"],
      app_role: ["admin", "user"],
      channel_code: ["A", "B"],
      message_sender_role: ["member", "admin"],
      prediction_tier: ["free", "vip"],
      request_kind: ["upgrade", "next_game", "general"],
      request_status: ["open", "answered", "closed"],
      user_status: ["active", "disabled"],
    },
  },
} as const
