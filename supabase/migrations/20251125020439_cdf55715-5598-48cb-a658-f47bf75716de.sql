-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create students table
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_name text NOT NULL,
  phone text NOT NULL,
  email text,
  photo_url text,
  qr_url text,
  seat_number text,
  monthly_fee numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'expired')),
  registration_date timestamptz DEFAULT now(),
  fee_due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create seats table
CREATE TABLE public.seats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number text NOT NULL UNIQUE,
  status text DEFAULT 'available' CHECK (status IN ('available', 'occupied')),
  student_id uuid REFERENCES public.students(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  payment_date timestamptz DEFAULT now(),
  payment_method text,
  next_due_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create seat history table
CREATE TABLE public.seat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES public.students(id) ON DELETE CASCADE,
  old_seat text,
  new_seat text,
  changed_at timestamptz DEFAULT now(),
  changed_by text
);

-- Create settings table
CREATE TABLE public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_seats integer DEFAULT 50,
  default_monthly_fee numeric DEFAULT 1000,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Insert default settings
INSERT INTO public.settings (total_seats, default_monthly_fee) 
VALUES (50, 1000);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated admin users
-- Students policies
CREATE POLICY "Authenticated users can view students"
  ON public.students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert students"
  ON public.students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update students"
  ON public.students FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete students"
  ON public.students FOR DELETE
  TO authenticated
  USING (true);

-- Seats policies
CREATE POLICY "Authenticated users can view seats"
  ON public.seats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert seats"
  ON public.seats FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update seats"
  ON public.seats FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete seats"
  ON public.seats FOR DELETE
  TO authenticated
  USING (true);

-- Payments policies
CREATE POLICY "Authenticated users can view payments"
  ON public.payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON public.payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON public.payments FOR UPDATE
  TO authenticated
  USING (true);

-- Seat history policies
CREATE POLICY "Authenticated users can view seat history"
  ON public.seat_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert seat history"
  ON public.seat_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Settings policies
CREATE POLICY "Authenticated users can view settings"
  ON public.settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update settings"
  ON public.settings FOR UPDATE
  TO authenticated
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON public.seats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();