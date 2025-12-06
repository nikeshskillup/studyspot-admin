-- Fix remaining RLS security issues
-- 1. Settings table - restrict to admin/staff
-- 2. Seat history - restrict to admin/staff
-- 3. Audit logs INSERT - restrict to admin/staff

-- ============================================
-- SETTINGS TABLE - Fix permissive policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;

-- Only admin/staff can view settings
CREATE POLICY "Staff and admins can view settings" ON public.settings
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- Only admins can update settings
CREATE POLICY "Admins can update settings" ON public.settings
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Admin-only INSERT and DELETE for settings management
CREATE POLICY "Admins can insert settings" ON public.settings
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete settings" ON public.settings
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ============================================
-- SEAT_HISTORY TABLE - Fix permissive policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can view seat history" ON public.seat_history;
DROP POLICY IF EXISTS "Authenticated users can insert seat history" ON public.seat_history;

-- Only admin/staff can view seat history
CREATE POLICY "Staff and admins can view seat history" ON public.seat_history
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- Only admin/staff can insert seat history
CREATE POLICY "Staff and admins can insert seat history" ON public.seat_history
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- ============================================
-- AUDIT_LOGS TABLE - Fix INSERT policy
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

-- Only admin/staff can insert audit logs
CREATE POLICY "Staff and admins can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role) 
    OR public.has_role(auth.uid(), 'staff'::app_role)
  );

-- ============================================
-- PAYMENTS TABLE - Add admin DELETE policy
-- ============================================
CREATE POLICY "Admins can delete payments" ON public.payments
  FOR DELETE USING (
    public.has_role(auth.uid(), 'admin'::app_role)
  );