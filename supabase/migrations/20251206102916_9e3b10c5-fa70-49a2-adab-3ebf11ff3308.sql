-- Create attendance table for check-in/check-out tracking
CREATE TABLE public.attendance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  check_out TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Staff and admins can view attendance
CREATE POLICY "Staff and admins can view attendance" ON public.attendance
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

-- Staff and admins can insert attendance
CREATE POLICY "Staff and admins can insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Staff and admins can update attendance (for check-out)
CREATE POLICY "Staff and admins can update attendance" ON public.attendance
  FOR UPDATE USING (public.is_admin_or_staff(auth.uid()));

-- Index for faster lookups
CREATE INDEX idx_attendance_student_id ON public.attendance(student_id);
CREATE INDEX idx_attendance_check_in ON public.attendance(check_in DESC);