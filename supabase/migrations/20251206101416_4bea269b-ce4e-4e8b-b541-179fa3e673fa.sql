-- Fix RLS policies for students table to use role-based access control
-- This replaces the overly permissive "true" conditions with proper role checks

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can insert students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can update students" ON public.students;
DROP POLICY IF EXISTS "Authenticated users can delete students" ON public.students;

-- Create new role-based policies
-- Staff and admins can view students
CREATE POLICY "Staff and admins can view students" ON public.students
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

-- Staff and admins can insert students
CREATE POLICY "Staff and admins can insert students" ON public.students
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Staff and admins can update students
CREATE POLICY "Staff and admins can update students" ON public.students
  FOR UPDATE USING (public.is_admin_or_staff(auth.uid()));

-- Only admins can delete students
CREATE POLICY "Admins can delete students" ON public.students
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));