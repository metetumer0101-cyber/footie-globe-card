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
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      api_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          payload?: Json
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          day: string
          endpoint: string
          requests: number
          updated_at: string
        }
        Insert: {
          day?: string
          endpoint: string
          requests?: number
          updated_at?: string
        }
        Update: {
          day?: string
          endpoint?: string
          requests?: number
          updated_at?: string
        }
        Relationships: []
      }
      cms_announcements: {
        Row: {
          active: boolean
          body: string | null
          created_at: string
          end_at: string | null
          id: string
          link: string | null
          priority: number
          start_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          link?: string | null
          priority?: number
          start_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string | null
          created_at?: string
          end_at?: string | null
          id?: string
          link?: string | null
          priority?: number
          start_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_cards: {
        Row: {
          age: number | null
          api_id: number | null
          avg_age: number | null
          career_goals: number | null
          club: string | null
          club_badge: string | null
          coach: Json | null
          contract_until: string | null
          core: Json | null
          created_at: string
          foot: string | null
          form: number | null
          formation: string | null
          goals_for: number | null
          height_cm: number | null
          id: string
          injuries: string | null
          league: string | null
          market_value: string | null
          matches: number | null
          mental: Json | null
          name: string
          nation: string | null
          photo: string | null
          physical: Json | null
          position: string | null
          published: boolean
          slug: string
          squad_value: string | null
          stats: Json | null
          style: string | null
          technical: Json | null
          tier: string | null
          trophies: number | null
          type: string
          updated_at: string
          weight_kg: number | null
          win_rate: number | null
        }
        Insert: {
          age?: number | null
          api_id?: number | null
          avg_age?: number | null
          career_goals?: number | null
          club?: string | null
          club_badge?: string | null
          coach?: Json | null
          contract_until?: string | null
          core?: Json | null
          created_at?: string
          foot?: string | null
          form?: number | null
          formation?: string | null
          goals_for?: number | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          league?: string | null
          market_value?: string | null
          matches?: number | null
          mental?: Json | null
          name: string
          nation?: string | null
          photo?: string | null
          physical?: Json | null
          position?: string | null
          published?: boolean
          slug: string
          squad_value?: string | null
          stats?: Json | null
          style?: string | null
          technical?: Json | null
          tier?: string | null
          trophies?: number | null
          type: string
          updated_at?: string
          weight_kg?: number | null
          win_rate?: number | null
        }
        Update: {
          age?: number | null
          api_id?: number | null
          avg_age?: number | null
          career_goals?: number | null
          club?: string | null
          club_badge?: string | null
          coach?: Json | null
          contract_until?: string | null
          core?: Json | null
          created_at?: string
          foot?: string | null
          form?: number | null
          formation?: string | null
          goals_for?: number | null
          height_cm?: number | null
          id?: string
          injuries?: string | null
          league?: string | null
          market_value?: string | null
          matches?: number | null
          mental?: Json | null
          name?: string
          nation?: string | null
          photo?: string | null
          physical?: Json | null
          position?: string | null
          published?: boolean
          slug?: string
          squad_value?: string | null
          stats?: Json | null
          style?: string | null
          technical?: Json | null
          tier?: string | null
          trophies?: number | null
          type?: string
          updated_at?: string
          weight_kg?: number | null
          win_rate?: number | null
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          body: Json
          created_at: string
          id: string
          meta_description: string | null
          published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: Json
          created_at?: string
          id?: string
          meta_description?: string | null
          published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: Json
          created_at?: string
          id?: string
          meta_description?: string | null
          published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_translations: {
        Row: {
          created_at: string
          id: string
          key: string
          locale: string
          namespace: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          locale: string
          namespace?: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          locale?: string
          namespace?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      injuries: {
        Row: {
          fixture_date: string | null
          fixture_id: number | null
          id: string
          player_id: number | null
          player_name: string | null
          reason: string | null
          status: string | null
          team_id: number | null
          team_name: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          fixture_date?: string | null
          fixture_id?: number | null
          id?: string
          player_id?: number | null
          player_name?: string | null
          reason?: string | null
          status?: string | null
          team_id?: number | null
          team_name?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          fixture_date?: string | null
          fixture_id?: number | null
          id?: string
          player_id?: number | null
          player_name?: string | null
          reason?: string | null
          status?: string | null
          team_id?: number | null
          team_name?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      match_events: {
        Row: {
          assist_id: number | null
          assist_name: string | null
          comments: string | null
          detail: string | null
          elapsed: number | null
          extra_time: number | null
          fixture_id: number
          id: string
          player_id: number | null
          player_name: string | null
          team_id: number | null
          team_name: string | null
          type: string
          updated_at: string
        }
        Insert: {
          assist_id?: number | null
          assist_name?: string | null
          comments?: string | null
          detail?: string | null
          elapsed?: number | null
          extra_time?: number | null
          fixture_id: number
          id?: string
          player_id?: number | null
          player_name?: string | null
          team_id?: number | null
          team_name?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          assist_id?: number | null
          assist_name?: string | null
          comments?: string | null
          detail?: string | null
          elapsed?: number | null
          extra_time?: number | null
          fixture_id?: number
          id?: string
          player_id?: number | null
          player_name?: string | null
          team_id?: number | null
          team_name?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      match_stats: {
        Row: {
          away_value: string | null
          fixture_id: number
          home_value: string | null
          id: string
          stat_type: string
          team_id: number
          team_name: string | null
          updated_at: string
        }
        Insert: {
          away_value?: string | null
          fixture_id: number
          home_value?: string | null
          id?: string
          stat_type: string
          team_id: number
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          away_value?: string | null
          fixture_id?: number
          home_value?: string | null
          id?: string
          stat_type?: string
          team_id?: number
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          total_xp: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          total_xp?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          total_xp?: number
          updated_at?: string
        }
        Relationships: []
      }
      standings: {
        Row: {
          draws: number
          form: string | null
          goal_diff: number
          goals_against: number
          goals_for: number
          id: string
          league_id: number
          logo: string | null
          losses: number
          played: number
          points: number
          rank: number
          season: number
          team_id: number
          team_name: string
          updated_at: string
          wins: number
        }
        Insert: {
          draws?: number
          form?: string | null
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          id?: string
          league_id: number
          logo?: string | null
          losses?: number
          played?: number
          points?: number
          rank: number
          season: number
          team_id: number
          team_name: string
          updated_at?: string
          wins?: number
        }
        Update: {
          draws?: number
          form?: string | null
          goal_diff?: number
          goals_against?: number
          goals_for?: number
          id?: string
          league_id?: number
          logo?: string | null
          losses?: number
          played?: number
          points?: number
          rank?: number
          season?: number
          team_id?: number
          team_name?: string
          updated_at?: string
          wins?: number
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
      world_players: {
        Row: {
          age: number | null
          api_id: number | null
          appearances: number | null
          assists: number | null
          club: string | null
          club_id: number | null
          firstname: string | null
          goals: number | null
          height_cm: number | null
          id: string
          injured: boolean
          lastname: string | null
          league: string | null
          league_id: number | null
          minutes: number | null
          name: string
          nationality: string | null
          photo: string | null
          position: string | null
          provider: string
          rating: number | null
          season: number | null
          sportmonks_id: number | null
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          age?: number | null
          api_id?: number | null
          appearances?: number | null
          assists?: number | null
          club?: string | null
          club_id?: number | null
          firstname?: string | null
          goals?: number | null
          height_cm?: number | null
          id?: string
          injured?: boolean
          lastname?: string | null
          league?: string | null
          league_id?: number | null
          minutes?: number | null
          name: string
          nationality?: string | null
          photo?: string | null
          position?: string | null
          provider?: string
          rating?: number | null
          season?: number | null
          sportmonks_id?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          age?: number | null
          api_id?: number | null
          appearances?: number | null
          assists?: number | null
          club?: string | null
          club_id?: number | null
          firstname?: string | null
          goals?: number | null
          height_cm?: number | null
          id?: string
          injured?: boolean
          lastname?: string | null
          league?: string | null
          league_id?: number | null
          minutes?: number | null
          name?: string
          nationality?: string | null
          photo?: string | null
          position?: string | null
          provider?: string
          rating?: number | null
          season?: number | null
          sportmonks_id?: number | null
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          created_at: string
          game: string
          id: string
          user_id: string
          xp: number
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          user_id: string
          xp: number
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: { Args: { _game: string; _xp: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_api_usage: {
        Args: { _count?: number; _endpoint: string }
        Returns: undefined
      }
      weekly_leaderboard: {
        Args: never
        Returns: {
          display_name: string
          id: string
          xp: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
    },
  },
} as const
