export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          genre: string | null
          format: string | null
          thumbnail_url: string | null
          created_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          genre?: string | null
          format?: string | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          genre?: string | null
          format?: string | null
          thumbnail_url?: string | null
          created_at?: string
          updated_at?: string
          user_id?: string
        }
      }
      scenes: {
        Row: {
          id: string
          project_id: string
          title: string
          description: string | null
          content: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          description?: string | null
          content?: string | null
          order_index: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          description?: string | null
          content?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      scene_versions: {
        Row: {
          id: string
          scene_id: string
          description: string | null
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          description?: string | null
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          description?: string | null
          content?: string
          created_at?: string
        }
      }
      storyboard_shots: {
        Row: {
          id: string
          scene_id: string
          url: string
          description: string | null
          duration: number
          order_index: number
          type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          url: string
          description?: string | null
          duration?: number
          order_index: number
          type?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          url?: string
          description?: string | null
          duration?: number
          order_index?: number
          type?: string
          created_at?: string
          updated_at?: string
        }
      }
      camera_settings: {
        Row: {
          id: string
          shot_id: string
          model: string | null
          lens: string | null
          aperture: string | null
          shutter_speed: string | null
          iso: string | null
          white_balance: string | null
          resolution: string | null
          frame_rate: string | null
          format: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          shot_id: string
          model?: string | null
          lens?: string | null
          aperture?: string | null
          shutter_speed?: string | null
          iso?: string | null
          white_balance?: string | null
          resolution?: string | null
          frame_rate?: string | null
          format?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shot_id?: string
          model?: string | null
          lens?: string | null
          aperture?: string | null
          shutter_speed?: string | null
          iso?: string | null
          white_balance?: string | null
          resolution?: string | null
          frame_rate?: string | null
          format?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      favorite_cameras: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      favorite_lenses: {
        Row: {
          id: string
          user_id: string
          name: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          created_at?: string
        }
      }
      audio_tracks: {
        Row: {
          id: string
          project_id: string
          name: string
          url: string
          duration: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          url: string
          duration?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          url?: string
          duration?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      media_files: {
        Row: {
          id: string
          user_id: string
          name: string
          url: string
          thumbnail_url: string | null
          type: string
          size: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          url: string
          thumbnail_url?: string | null
          type: string
          size?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          url?: string
          thumbnail_url?: string | null
          type?: string
          size?: string | null
          created_at?: string
        }
      }
      project_collaborators: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      comments: {
        Row: {
          id: string
          scene_id: string
          user_id: string
          content: string
          created_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          user_id: string
          content: string
          created_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          user_id?: string
          content?: string
          created_at?: string
        }
      }
      scene_metadata: {
        Row: {
          id: string
          scene_id: string
          camera: string | null
          lighting: string | null
          audio: string | null
          duration: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          scene_id: string
          camera?: string | null
          lighting?: string | null
          audio?: string | null
          duration?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          scene_id?: string
          camera?: string | null
          lighting?: string | null
          audio?: string | null
          duration?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
