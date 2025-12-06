-- Fix RLS policies for payments table to use role-based access control
-- This replaces the overly permissive "true" conditions with proper role checks

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;

-- Create new role-based policies
-- Staff and admins can view payments
CREATE POLICY "Staff and admins can view payments" ON public.payments
  FOR SELECT USING (public.is_admin_or_staff(auth.uid()));

-- Staff and admins can insert payments (staff can record fees per memory)
CREATE POLICY "Staff and admins can insert payments" ON public.payments
  FOR INSERT WITH CHECK (public.is_admin_or_staff(auth.uid()));

-- Only admins can update payments (financial record protection)
CREATE POLICY "Admins can update payments" ON public.payments
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));