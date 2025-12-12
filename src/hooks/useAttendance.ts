import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type Attendance = Tables<'attendance'>;
type AttendanceInsert = TablesInsert<'attendance'>;

export const useAttendance = () => {
  return useQuery({
    queryKey: ['attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          students (
            ss_id,
            name
          )
        `)
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });
};

export const useTodayAttendance = () => {
  const today = new Date().toISOString().split('T')[0];

  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendance')
        .select(`
          *,
          students (
            ss_id,
            name
          )
        `)
        .gte('timestamp', `${today}T00:00:00`)
        .lte('timestamp', `${today}T23:59:59`)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

export const useMarkAttendance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendance: Omit<AttendanceInsert, 'recorded_by'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          ...attendance,
          recorded_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success(`Marked as ${variables.type === 'check-in' ? 'Check-in' : 'Check-out'}`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to mark attendance: ${err.message}`);
    },
  });
};
