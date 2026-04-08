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
      admin_notes: {
        Row: {
          client_id: string
          created_at: string
          id: string
          is_visible_to_client: boolean
          note_content: string
          note_type: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          is_visible_to_client?: boolean
          note_content: string
          note_type?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          is_visible_to_client?: boolean
          note_content?: string
          note_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      ask_will_messages: {
        Row: {
          client_id: string
          content: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      brand_voice: {
        Row: {
          client_results: string
          content_pillars: string
          core_voice: string
          created_at: string
          hook_frameworks: string
          id: string
          key_phrases: string
          objection_handling: string
          outreach_scripts: string
          sales_frameworks: string
          script_examples: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_results?: string
          content_pillars?: string
          core_voice?: string
          created_at?: string
          hook_frameworks?: string
          id?: string
          key_phrases?: string
          objection_handling?: string
          outreach_scripts?: string
          sales_frameworks?: string
          script_examples?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_results?: string
          content_pillars?: string
          core_voice?: string
          created_at?: string
          hook_frameworks?: string
          id?: string
          key_phrases?: string
          objection_handling?: string
          outreach_scripts?: string
          sales_frameworks?: string
          script_examples?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_calendar: {
        Row: {
          content_type: string | null
          created_at: string
          date: string
          format: string | null
          hook_or_topic: string | null
          id: string
          idea_id: string | null
          user_id: string
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          date: string
          format?: string | null
          hook_or_topic?: string | null
          id?: string
          idea_id?: string | null
          user_id: string
        }
        Update: {
          content_type?: string | null
          created_at?: string
          date?: string
          format?: string | null
          hook_or_topic?: string | null
          id?: string
          idea_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_calendar_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "idea_bank"
            referencedColumns: ["id"]
          },
        ]
      }
      content_log: {
        Row: {
          created_at: string
          date_posted: string
          dms_from_post: number | null
          follows_from_post: number | null
          format: Database["public"]["Enums"]["content_format"]
          hook: string | null
          id: string
          notes: string | null
          profile_visits: number | null
          saves: number | null
          shares: number | null
          topic_angle: string | null
          user_id: string
          views: number | null
          week_number: number | null
        }
        Insert: {
          created_at?: string
          date_posted?: string
          dms_from_post?: number | null
          follows_from_post?: number | null
          format?: Database["public"]["Enums"]["content_format"]
          hook?: string | null
          id?: string
          notes?: string | null
          profile_visits?: number | null
          saves?: number | null
          shares?: number | null
          topic_angle?: string | null
          user_id: string
          views?: number | null
          week_number?: number | null
        }
        Update: {
          created_at?: string
          date_posted?: string
          dms_from_post?: number | null
          follows_from_post?: number | null
          format?: Database["public"]["Enums"]["content_format"]
          hook?: string | null
          id?: string
          notes?: string | null
          profile_visits?: number | null
          saves?: number | null
          shares?: number | null
          topic_angle?: string | null
          user_id?: string
          views?: number | null
          week_number?: number | null
        }
        Relationships: []
      }
      daily_outreach: {
        Row: {
          created_at: string
          date: string
          day_of_week: string | null
          dms_sent: number | null
          id: string
          notes: string | null
          platform: Database["public"]["Enums"]["outreach_platform"]
          qualified_leads: number | null
          responses: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          day_of_week?: string | null
          dms_sent?: number | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["outreach_platform"]
          qualified_leads?: number | null
          responses?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          day_of_week?: string | null
          dms_sent?: number | null
          id?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["outreach_platform"]
          qualified_leads?: number | null
          responses?: number | null
          user_id?: string
        }
        Relationships: []
      }
      dm_sales: {
        Row: {
          call_booked: boolean | null
          call_completed: boolean | null
          call_date: string | null
          call_time: string | null
          closed: boolean | null
          contact_info: string | null
          created_at: string
          date: string
          deal_value: number | null
          follow_up_date: string | null
          follow_up_note: string | null
          how_booked: string | null
          id: string
          lead_name: string | null
          live_call_notes: string | null
          notes: string | null
          objections: string | null
          outcome_notes: string | null
          pain_points: string | null
          pre_call_notes: string | null
          revenue: number | null
          source: Database["public"]["Enums"]["lead_source"] | null
          stage: Database["public"]["Enums"]["lead_stage"] | null
          user_id: string
          week_number: number | null
        }
        Insert: {
          call_booked?: boolean | null
          call_completed?: boolean | null
          call_date?: string | null
          call_time?: string | null
          closed?: boolean | null
          contact_info?: string | null
          created_at?: string
          date?: string
          deal_value?: number | null
          follow_up_date?: string | null
          follow_up_note?: string | null
          how_booked?: string | null
          id?: string
          lead_name?: string | null
          live_call_notes?: string | null
          notes?: string | null
          objections?: string | null
          outcome_notes?: string | null
          pain_points?: string | null
          pre_call_notes?: string | null
          revenue?: number | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          stage?: Database["public"]["Enums"]["lead_stage"] | null
          user_id: string
          week_number?: number | null
        }
        Update: {
          call_booked?: boolean | null
          call_completed?: boolean | null
          call_date?: string | null
          call_time?: string | null
          closed?: boolean | null
          contact_info?: string | null
          created_at?: string
          date?: string
          deal_value?: number | null
          follow_up_date?: string | null
          follow_up_note?: string | null
          how_booked?: string | null
          id?: string
          lead_name?: string | null
          live_call_notes?: string | null
          notes?: string | null
          objections?: string | null
          outcome_notes?: string | null
          pain_points?: string | null
          pre_call_notes?: string | null
          revenue?: number | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          stage?: Database["public"]["Enums"]["lead_stage"] | null
          user_id?: string
          week_number?: number | null
        }
        Relationships: []
      }
      idea_bank: {
        Row: {
          content_type: Database["public"]["Enums"]["content_type"] | null
          created_at: string
          date_added: string
          filming_queue_order: number | null
          format: Database["public"]["Enums"]["content_format"] | null
          full_concept: string | null
          hook_title: string | null
          id: string
          planned_film_date: string | null
          planned_post_date: string | null
          posted_at: string | null
          priority: Database["public"]["Enums"]["priority_level"] | null
          source_context: string | null
          status: Database["public"]["Enums"]["idea_status"] | null
          user_id: string
        }
        Insert: {
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string
          date_added?: string
          filming_queue_order?: number | null
          format?: Database["public"]["Enums"]["content_format"] | null
          full_concept?: string | null
          hook_title?: string | null
          id?: string
          planned_film_date?: string | null
          planned_post_date?: string | null
          posted_at?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          source_context?: string | null
          status?: Database["public"]["Enums"]["idea_status"] | null
          user_id: string
        }
        Update: {
          content_type?: Database["public"]["Enums"]["content_type"] | null
          created_at?: string
          date_added?: string
          filming_queue_order?: number | null
          format?: Database["public"]["Enums"]["content_format"] | null
          full_concept?: string | null
          hook_title?: string | null
          id?: string
          planned_film_date?: string | null
          planned_post_date?: string | null
          posted_at?: string | null
          priority?: Database["public"]["Enums"]["priority_level"] | null
          source_context?: string | null
          status?: Database["public"]["Enums"]["idea_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      ig_daily_snapshots: {
        Row: {
          fetched_at: string
          follower_count: number | null
          id: string
          instagram_handle: string
          raw_data: Json
          snapshot_date: string | null
          user_id: string
        }
        Insert: {
          fetched_at?: string
          follower_count?: number | null
          id?: string
          instagram_handle: string
          raw_data?: Json
          snapshot_date?: string | null
          user_id: string
        }
        Update: {
          fetched_at?: string
          follower_count?: number | null
          id?: string
          instagram_handle?: string
          raw_data?: Json
          snapshot_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inspiration_accounts: {
        Row: {
          created_at: string
          handle: string
          id: string
          notes: string | null
          platform: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          handle: string
          id?: string
          notes?: string | null
          platform?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          handle?: string
          id?: string
          notes?: string | null
          platform?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      knowledge_base: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          search_vector: unknown
          section_number: string
          section_title: string
        }
        Insert: {
          category: string
          content: string
          created_at?: string
          id?: string
          search_vector?: unknown
          section_number: string
          section_title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          search_vector?: unknown
          section_number?: string
          section_title?: string
        }
        Relationships: []
      }
      outreach_messages: {
        Row: {
          id: string
          message: string
          testing_notes: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          message?: string
          testing_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          message?: string
          testing_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_audits: {
        Row: {
          audit_data: Json | null
          created_at: string
          id: string
          overall_score: number | null
          overall_verdict: string | null
          rewritten_bio: string | null
          screenshot_url: string | null
          user_id: string
        }
        Insert: {
          audit_data?: Json | null
          created_at?: string
          id?: string
          overall_score?: number | null
          overall_verdict?: string | null
          rewritten_bio?: string | null
          screenshot_url?: string | null
          user_id: string
        }
        Update: {
          audit_data?: Json | null
          created_at?: string
          id?: string
          overall_score?: number | null
          overall_verdict?: string | null
          rewritten_bio?: string | null
          screenshot_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          checklist_generated_at: string | null
          created_at: string
          dashboard_bio: string | null
          date_joined: string | null
          email: string
          id: string
          instagram_data: Json | null
          instagram_refreshed_at: string | null
          instagram_username: string | null
          intro_extended: Json | null
          intro_freeform: string | null
          intro_insights: Json | null
          intro_processed: boolean | null
          intro_structured: Json | null
          intro_text: string | null
          is_active: boolean
          latest_profile_score: number | null
          name: string
          ninety_day_follower_goal: number | null
          ninety_day_revenue_goal: number | null
          onboarding_complete: boolean
          phase: Database["public"]["Enums"]["app_phase"] | null
          starting_active_clients: number | null
          starting_avg_reel_views: number | null
          starting_followers: number | null
          starting_monthly_revenue: number | null
          updated_at: string
          user_id: string
          weekly_checklist: Json | null
        }
        Insert: {
          checklist_generated_at?: string | null
          created_at?: string
          dashboard_bio?: string | null
          date_joined?: string | null
          email: string
          id?: string
          instagram_data?: Json | null
          instagram_refreshed_at?: string | null
          instagram_username?: string | null
          intro_extended?: Json | null
          intro_freeform?: string | null
          intro_insights?: Json | null
          intro_processed?: boolean | null
          intro_structured?: Json | null
          intro_text?: string | null
          is_active?: boolean
          latest_profile_score?: number | null
          name: string
          ninety_day_follower_goal?: number | null
          ninety_day_revenue_goal?: number | null
          onboarding_complete?: boolean
          phase?: Database["public"]["Enums"]["app_phase"] | null
          starting_active_clients?: number | null
          starting_avg_reel_views?: number | null
          starting_followers?: number | null
          starting_monthly_revenue?: number | null
          updated_at?: string
          user_id: string
          weekly_checklist?: Json | null
        }
        Update: {
          checklist_generated_at?: string | null
          created_at?: string
          dashboard_bio?: string | null
          date_joined?: string | null
          email?: string
          id?: string
          instagram_data?: Json | null
          instagram_refreshed_at?: string | null
          instagram_username?: string | null
          intro_extended?: Json | null
          intro_freeform?: string | null
          intro_insights?: Json | null
          intro_processed?: boolean | null
          intro_structured?: Json | null
          intro_text?: string | null
          is_active?: boolean
          latest_profile_score?: number | null
          name?: string
          ninety_day_follower_goal?: number | null
          ninety_day_revenue_goal?: number | null
          onboarding_complete?: boolean
          phase?: Database["public"]["Enums"]["app_phase"] | null
          starting_active_clients?: number | null
          starting_avg_reel_views?: number | null
          starting_followers?: number | null
          starting_monthly_revenue?: number | null
          updated_at?: string
          user_id?: string
          weekly_checklist?: Json | null
        }
        Relationships: []
      }
      sales_scripts: {
        Row: {
          id: string
          script: string
          testing_notes: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          id?: string
          script?: string
          testing_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          id?: string
          script?: string
          testing_notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_hooks: {
        Row: {
          content_type_suggestion: string | null
          created_at: string
          hook_text: string
          id: string
          user_id: string
        }
        Insert: {
          content_type_suggestion?: string | null
          created_at?: string
          hook_text: string
          id?: string
          user_id: string
        }
        Update: {
          content_type_suggestion?: string | null
          created_at?: string
          hook_text?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_replies: {
        Row: {
          conversation_stage: string | null
          created_at: string
          id: string
          original_message: string | null
          reply_text: string
          user_id: string
        }
        Insert: {
          conversation_stage?: string | null
          created_at?: string
          id?: string
          original_message?: string | null
          reply_text: string
          user_id: string
        }
        Update: {
          conversation_stage?: string | null
          created_at?: string
          id?: string
          original_message?: string | null
          reply_text?: string
          user_id?: string
        }
        Relationships: []
      }
      transcription_jobs: {
        Row: {
          caption: string | null
          comments: number | null
          created_at: string
          date_posted: string | null
          error: string | null
          id: string
          likes: number | null
          reel_url: string
          source: string | null
          status: string
          transcript: string | null
          updated_at: string
          user_id: string
          views: number | null
        }
        Insert: {
          caption?: string | null
          comments?: number | null
          created_at?: string
          date_posted?: string | null
          error?: string | null
          id?: string
          likes?: number | null
          reel_url: string
          source?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
          user_id: string
          views?: number | null
        }
        Update: {
          caption?: string | null
          comments?: number | null
          created_at?: string
          date_posted?: string | null
          error?: string | null
          id?: string
          likes?: number | null
          reel_url?: string
          source?: string | null
          status?: string
          transcript?: string | null
          updated_at?: string
          user_id?: string
          views?: number | null
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
      weekly_focus: {
        Row: {
          focus_text: string
          id: string
          set_on: string
          updated_at: string
          user_id: string
        }
        Insert: {
          focus_text?: string
          id?: string
          set_on?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          focus_text?: string
          id?: string
          set_on?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_log: {
        Row: {
          avg_reel_views: number | null
          avg_saves: number | null
          avg_shares: number | null
          biggest_bottleneck: string | null
          biggest_win: string | null
          calls_booked: number | null
          clients_signed: number | null
          created_at: string
          current_phase: Database["public"]["Enums"]["app_phase"] | null
          date: string
          dms_received: number | null
          followers_total: number | null
          id: string
          message_for_will: string | null
          message_read: boolean | null
          outreach_sent: number | null
          profile_visits: number | null
          reels_posted: number | null
          revenue: number | null
          user_id: string
          week_number: number
        }
        Insert: {
          avg_reel_views?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          biggest_bottleneck?: string | null
          biggest_win?: string | null
          calls_booked?: number | null
          clients_signed?: number | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["app_phase"] | null
          date: string
          dms_received?: number | null
          followers_total?: number | null
          id?: string
          message_for_will?: string | null
          message_read?: boolean | null
          outreach_sent?: number | null
          profile_visits?: number | null
          reels_posted?: number | null
          revenue?: number | null
          user_id: string
          week_number: number
        }
        Update: {
          avg_reel_views?: number | null
          avg_saves?: number | null
          avg_shares?: number | null
          biggest_bottleneck?: string | null
          biggest_win?: string | null
          calls_booked?: number | null
          clients_signed?: number | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["app_phase"] | null
          date?: string
          dms_received?: number | null
          followers_total?: number | null
          id?: string
          message_for_will?: string | null
          message_read?: boolean | null
          outreach_sent?: number | null
          profile_visits?: number | null
          reels_posted?: number | null
          revenue?: number | null
          user_id?: string
          week_number?: number
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
      search_knowledge_base: {
        Args: { match_count?: number; query_text: string }
        Returns: {
          category: string
          content: string
          id: string
          rank: number
          section_number: string
          section_title: string
        }[]
      }
    }
    Enums: {
      app_phase: "1" | "2" | "3" | "4" | "5"
      app_role: "admin" | "client"
      content_format:
        | "Reel"
        | "Story Sequence"
        | "Carousel"
        | "Static Post"
        | "YouTube"
        | "TikTok"
      content_type:
        | "Value"
        | "Brainrot"
        | "Authentic"
        | "Proof"
        | "Controversial"
        | "Storytelling"
      idea_status:
        | "Not Started"
        | "Scripting"
        | "Filming"
        | "Editing"
        | "Posted"
      lead_source:
        | "Content"
        | "DM Outreach"
        | "Story Sequence"
        | "Referral"
        | "Other"
      lead_stage:
        | "New DM"
        | "Nurturing"
        | "Qualified"
        | "Call Set"
        | "Call Done"
        | "Closed Won"
        | "Closed Lost"
        | "Call Booked"
        | "On Call"
        | "No Show"
        | "Follow Up"
        | "Offer Made"
      outreach_platform: "Instagram" | "TikTok" | "LinkedIn" | "Other"
      priority_level: "High" | "Medium" | "Low" | "Someday"
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
      app_phase: ["1", "2", "3", "4", "5"],
      app_role: ["admin", "client"],
      content_format: [
        "Reel",
        "Story Sequence",
        "Carousel",
        "Static Post",
        "YouTube",
        "TikTok",
      ],
      content_type: [
        "Value",
        "Brainrot",
        "Authentic",
        "Proof",
        "Controversial",
        "Storytelling",
      ],
      idea_status: ["Not Started", "Scripting", "Filming", "Editing", "Posted"],
      lead_source: [
        "Content",
        "DM Outreach",
        "Story Sequence",
        "Referral",
        "Other",
      ],
      lead_stage: [
        "New DM",
        "Nurturing",
        "Qualified",
        "Call Set",
        "Call Done",
        "Closed Won",
        "Closed Lost",
        "Call Booked",
        "On Call",
        "No Show",
        "Follow Up",
        "Offer Made",
      ],
      outreach_platform: ["Instagram", "TikTok", "LinkedIn", "Other"],
      priority_level: ["High", "Medium", "Low", "Someday"],
    },
  },
} as const
