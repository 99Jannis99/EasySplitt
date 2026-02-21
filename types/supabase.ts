export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string };
        Insert: { id: string; display_name?: string | null; avatar_url?: string | null };
        Update: { display_name?: string | null; avatar_url?: string | null; updated_at?: string };
      };
      groups: {
        Row: { id: string; name: string; created_by: string; created_at: string; updated_at: string };
        Insert: { name: string; created_by: string };
        Update: { name?: string; updated_at?: string };
      };
      group_members: {
        Row: { id: string; group_id: string; user_id: string; display_name: string; role: string; created_at: string };
        Insert: { group_id: string; user_id: string; display_name: string; role?: string };
        Update: { display_name?: string };
      };
      expenses: {
        Row: { id: string; group_id: string; title: string; description: string; amount: number; payer_id: string; created_by: string; created_at: string; updated_at: string };
        Insert: { group_id: string; title: string; description?: string; amount: number; payer_id: string; created_by: string };
        Update: { title?: string; description?: string; amount?: number; payer_id?: string; updated_at?: string };
      };
      expense_splits: {
        Row: { expense_id: string; user_id: string };
        Insert: { expense_id: string; user_id: string };
        Update: never;
      };
    };
    Functions: {
      invite_user_to_group: {
        Args: { p_group_id: string; p_email: string; p_display_name?: string | null };
        Returns: string;
      };
    };
  };
}
