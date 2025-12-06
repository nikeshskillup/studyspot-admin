import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AttendanceRecord {
  id: string;
  student_id: string;
  check_in: string;
  check_out: string | null;
  created_at: string;
  students?: {
    student_name: string;
    student_id: string;
    seat_number: string | null;
    phone: string;
  };
}

export const useAttendance = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkIn = async (studentId: string) => {
    setLoading(true);
    try {
      // Check if student has an active session (checked in but not checked out)
      const { data: activeSession } = await supabase
        .from("attendance")
        .select("id, check_in")
        .eq("student_id", studentId)
        .is("check_out", null)
        .maybeSingle();

      if (activeSession) {
        toast({
          title: "Already Checked In",
          description: "This student is already checked in. Please check out first.",
          variant: "destructive",
        });
        setLoading(false);
        return { success: false, action: "already_checked_in", session: activeSession };
      }

      // Create new check-in
      const { data, error } = await supabase
        .from("attendance")
        .insert({ student_id: studentId })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Check-In Successful",
        description: "Student has been checked in.",
      });

      return { success: true, action: "check_in", session: data };
    } catch (error: any) {
      toast({
        title: "Check-In Failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, action: "error", error };
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async (studentId: string) => {
    setLoading(true);
    try {
      // Find active session
      const { data: activeSession, error: findError } = await supabase
        .from("attendance")
        .select("id")
        .eq("student_id", studentId)
        .is("check_out", null)
        .maybeSingle();

      if (findError) throw findError;

      if (!activeSession) {
        toast({
          title: "Not Checked In",
          description: "This student is not currently checked in.",
          variant: "destructive",
        });
        return { success: false, action: "not_checked_in" };
      }

      // Update with check-out time
      const { data, error } = await supabase
        .from("attendance")
        .update({ check_out: new Date().toISOString() })
        .eq("id", activeSession.id)
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Check-Out Successful",
        description: "Student has been checked out.",
      });

      return { success: true, action: "check_out", session: data };
    } catch (error: any) {
      toast({
        title: "Check-Out Failed",
        description: error.message,
        variant: "destructive",
      });
      return { success: false, action: "error", error };
    } finally {
      setLoading(false);
    }
  };

  const getStudentByQR = async (studentIdOrUUID: string) => {
    // Support both student_id (SS1000) and UUID formats
    const isUUID = studentIdOrUUID.includes("-");
    
    const query = supabase
      .from("students")
      .select("id, student_name, student_id, seat_number, phone, subscription_status");

    const { data, error } = isUUID 
      ? await query.eq("id", studentIdOrUUID).maybeSingle()
      : await query.eq("student_id", studentIdOrUUID).maybeSingle();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to find student.",
        variant: "destructive",
      });
      return null;
    }

    return data;
  };

  const getTodayAttendance = async (): Promise<AttendanceRecord[]> => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        id,
        student_id,
        check_in,
        check_out,
        created_at,
        students (
          student_name,
          student_id,
          seat_number,
          phone
        )
      `)
      .gte("check_in", today.toISOString())
      .order("check_in", { ascending: false });

    if (error) {
      console.error("Error fetching attendance:", error);
      return [];
    }

    return data as AttendanceRecord[];
  };

  const getActiveCheckIns = async (): Promise<AttendanceRecord[]> => {
    const { data, error } = await supabase
      .from("attendance")
      .select(`
        id,
        student_id,
        check_in,
        check_out,
        created_at,
        students (
          student_name,
          student_id,
          seat_number,
          phone
        )
      `)
      .is("check_out", null)
      .order("check_in", { ascending: false });

    if (error) {
      console.error("Error fetching active check-ins:", error);
      return [];
    }

    return data as AttendanceRecord[];
  };

  return {
    loading,
    checkIn,
    checkOut,
    getStudentByQR,
    getTodayAttendance,
    getActiveCheckIns,
  };
};
