-- Fix RLS policies for students and seats tables
-- Issue 1: Students table - replace is_admin_or_staff with explicit role checks
-- Issue 2: Seats table - replace permissive "true" conditions with role checks

-- ============================================
-- STUDENTS TABLE - Fix SELECT policy
-- ============================================
DROP POLICY IF EXISTS "Staff and admins can view students" ON public.students;

CREATE POLICY "Staff and admins can view students" ON public.students
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- Also update INSERT and UPDATE to use explicit role checks for consistency
DROP POLICY IF EXISTS "Staff and admins can insert students" ON public.students;

CREATE POLICY "Staff and admins can insert students" ON public.students
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

DROP POLICY IF EXISTS "Staff and admins can update students" ON public.students;

CREATE POLICY "Staff and admins can update students" ON public.students
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- ============================================
-- SEATS TABLE - Fix all permissive policies
-- ============================================
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view seats" ON public.seats;
DROP POLICY IF EXISTS "Authenticated users can insert seats" ON public.seats;
DROP POLICY IF EXISTS "Authenticated users can update seats" ON public.seats;
DROP POLICY IF EXISTS "Authenticated users can delete seats" ON public.seats;

-- Create new role-based policies
CREATE POLICY "Staff and admins can view seats" ON public.seats
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Staff and admins can insert seats" ON public.seats
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Staff and admins can update seats" ON public.seats
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

CREATE POLICY "Staff and admins can delete seats" ON public.seats
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );