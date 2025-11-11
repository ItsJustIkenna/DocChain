import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client with service role (for server-side only)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Database types
export interface Doctor {
  id: string;
  email: string;
  full_name: string;
  specialty: string;
  license_number: string;
  license_state: string;
  npi_number: string;
  is_verified: boolean;
  hourly_rate_usd: number;
  stripe_account_id?: string;
  sui_address?: string;
  bio?: string;
  photo_url?: string;
  years_experience?: number;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  date_of_birth?: string;
  sui_address?: string;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  doctor_id: string;
  patient_id: string;
  appointment_time: string;
  duration_minutes: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  price_usd: number;
  platform_fee_usd: number;
  doctor_payout_usd: number;
  stripe_payment_intent_id?: string;
  stripe_payout_id?: string;
  sui_transaction_digest?: string;
  video_room_id?: string;
  cancellation_reason?: string;
  cancelled_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  doctor?: Doctor;
  patient?: Patient;
}

export interface AvailabilitySlot {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  created_at: string;
}
