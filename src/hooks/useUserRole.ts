import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "staff";

interface UserRoleState {
  role: AppRole | null;
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
}

export const useUserRole = () => {
  const [state, setState] = useState<UserRoleState>({
    role: null,
    isAdmin: false,
    isStaff: false,
    loading: true,
  });

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState({ role: null, isAdmin: false, isStaff: false, loading: false });
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const userRole = roles?.[0]?.role as AppRole | undefined;
      
      setState({
        role: userRole || null,
        isAdmin: userRole === "admin",
        isStaff: userRole === "staff" || userRole === "admin",
        loading: false,
      });
    };

    fetchRole();
  }, []);

  return state;
};
