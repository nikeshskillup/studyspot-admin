import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables } from '@/integrations/supabase/types';

type Seat = Tables<'seats'>;

export const useSeats = () => {
  return useQuery({
    queryKey: ['seats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seats')
        .select(`
          *,
          students (
            id,
            ss_id,
            name
          )
        `)
        .order('seat_number', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};

export const useAssignSeat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ seatId, studentId }: { seatId: string; studentId: string | null }) => {
      const { data, error } = await supabase
        .from('seats')
        .update({ student_id: studentId })
        .eq('id', seatId)
        .select()
        .single();

      if (error) throw error;

      if (studentId) {
        const { data: seatData } = await supabase
          .from('seats')
          .select('seat_number')
          .eq('id', seatId)
          .single();

        if (seatData) {
          await supabase
            .from('students')
            .update({ seat_number: seatData.seat_number })
            .eq('id', studentId);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Seat assignment updated!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to assign seat: ${error.message}`);
    },
  });
};

export const useClearSeat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seatId: string) => {
      const { data: seatData } = await supabase
        .from('seats')
        .select('student_id, seat_number')
        .eq('id', seatId)
        .single();

      if (seatData?.student_id) {
        await supabase
          .from('students')
          .update({ seat_number: null })
          .eq('id', seatData.student_id);
      }

      const { data, error } = await supabase
        .from('seats')
        .update({ student_id: null })
        .eq('id', seatId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Seat cleared!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to clear seat: ${error.message}`);
    },
  });
};

export const useInitializeSeats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (totalSeats: number) => {
      const seats = Array.from({ length: totalSeats }, (_, i) => ({
        seat_number: i + 1,
      }));

      const { error } = await supabase.from('seats').insert(seats);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seats'] });
      toast.success('Seats initialized!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to initialize seats: ${error.message}`);
    },
  });
};
