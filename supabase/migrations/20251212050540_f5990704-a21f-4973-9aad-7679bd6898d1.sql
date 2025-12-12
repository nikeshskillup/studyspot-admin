-- Drop existing tables to recreate with new schema
DROP TABLE IF EXISTS public.attendance CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.seats CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.seat_history CASCADE;
DROP TABLE IF EXISTS public.settings CASCADE;

-- Create enums
DO $$ BEGIN
  CREATE TYPE public.student_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fee_status AS ENUM ('paid', 'pending', 'overdue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_type AS ENUM ('check-in', 'check-out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_method AS ENUM ('cash', 'upi', 'online', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create students table with new schema
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ss_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  photo TEXT,
  seat_number INTEGER,
  monthly_fee NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  status public.student_status NOT NULL DEFAULT 'active',
  fee_status public.fee_status NOT NULL DEFAULT 'pending',
  date_joined TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view students" ON public.students
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can insert students" ON public.students
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can update students" ON public.students
  FOR UPDATE USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can delete students" ON public.students
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Create seats table with new schema
CREATE TABLE public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seat_number INTEGER NOT NULL UNIQUE,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view seats" ON public.seats
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can insert seats" ON public.seats
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can update seats" ON public.seats
  FOR UPDATE USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can delete seats" ON public.seats
  FOR DELETE USING (public.is_admin_or_staff(auth.uid()));

-- Create attendance table with new schema
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  type public.attendance_type NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view attendance" ON public.attendance
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can update attendance" ON public.attendance
  FOR UPDATE USING (public.is_admin_or_staff(auth.uid()));

-- Create payments table with new schema
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  method public.payment_method NOT NULL DEFAULT 'cash',
  payment_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view payments" ON public.payments
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Staff and admins can insert payments" ON public.payments
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update settings table
DROP TABLE IF EXISTS public.settings;
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL DEFAULT 'StudySpot',
  total_seats INTEGER NOT NULL DEFAULT 50,
  default_monthly_fee NUMERIC NOT NULL DEFAULT 1000,
  logo_url TEXT,
  primary_color TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff and admins can view settings" ON public.settings
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

CREATE POLICY "Admins can insert settings" ON public.settings
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update settings" ON public.settings
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete settings" ON public.settings
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Insert default settings
INSERT INTO public.settings (brand_name, total_seats, default_monthly_fee) 
VALUES ('StudySpot', 50, 1000)
ON CONFLICT DO NOTHING;

-- Update audit_logs table structure
ALTER TABLE public.audit_logs 
  DROP COLUMN IF EXISTS table_name,
  DROP COLUMN IF EXISTS record_id,
  DROP COLUMN IF EXISTS user_role;

ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ NOT NULL DEFAULT now();

-- Rename created_at to timestamp if needed (skip if already done)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'created_at') THEN
    ALTER TABLE public.audit_logs DROP COLUMN created_at;
  END IF;
END $$;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(_action TEXT, _details TEXT DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id UUID;
  _user_email TEXT;
  _log_id UUID;
BEGIN
  _user_id := auth.uid();
  
  SELECT email INTO _user_email FROM auth.users WHERE id = _user_id;
  
  INSERT INTO public.audit_logs (user_id, user_email, action, details, timestamp)
  VALUES (_user_id, _user_email, _action, _details, now())
  RETURNING id INTO _log_id;
  
  RETURN _log_id;
END;
$$;

-- Create function to check if user is authenticated staff
CREATE OR REPLACE FUNCTION public.is_authenticated_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'staff')
  )
$$;

-- Create trigger for profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  
  -- If no admin exists, make first user admin
  IF NOT public.admin_exists() THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
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

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_seats_updated_at ON public.seats;
CREATE TRIGGER update_seats_updated_at
  BEFORE UPDATE ON public.seats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Generate SS ID function
CREATE OR REPLACE FUNCTION public.generate_ss_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id TEXT;
  counter INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ss_id FROM 3) AS INTEGER)), 999) + 1 
  INTO counter 
  FROM public.students 
  WHERE ss_id IS NOT NULL AND ss_id ~ '^SS[0-9]+$';
  
  new_id := 'SS' || LPAD(counter::TEXT, 4, '0');
  RETURN new_id;
END;
$$;