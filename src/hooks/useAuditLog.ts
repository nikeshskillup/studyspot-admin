import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface AuditLogParams {
  action: string;
  tableName?: string;
  recordId?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const logAction = async ({ action, tableName, recordId, details }: AuditLogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      await supabase.from("audit_logs").insert([{
        user_id: user.id,
        user_email: user.email,
        user_role: roleData?.role || "unknown",
        action,
        table_name: tableName,
        record_id: recordId,
        details: details as Json,
      }]);
    } catch (error) {
      console.error("Failed to log action:", error);
    }
  };

  return { logAction };
};
