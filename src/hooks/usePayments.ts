import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type Payment = Tables<'payments'>;
type PaymentInsert = TablesInsert<'payments'>;

export type PaymentsQueryParams = {
  page?: number;
  pageSize?: number;
  student_id?: string | null;
};

export const usePayments = (params: PaymentsQueryParams = {}) => {
  const { page, pageSize, student_id } = params;

  if (page && pageSize) {
    return useQuery({
      queryKey: ['payments', params],
      queryFn: async () => {
        let query = supabase
          .from('payments')
          .select(`
            *,
            students (
              ss_id,
              name
            )
          `, { count: 'exact' })
          .order('payment_date', { ascending: false });

        if (student_id) query = query.eq('student_id', student_id);

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const { data, error, count } = await query.range(from, to);

        if (error) throw error;
        return { data: data || [], count: count ?? 0 };
      },
    });
  }

  return useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          students (
            ss_id,
            name
          )
        `)
        .order('payment_date', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
  });
};

export const useAddPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payment: PaymentInsert) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('payments')
        .insert({
          ...payment,
          recorded_by: user?.id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      toast.success('Payment recorded successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to record payment: ${error.message}`);
    },
  });
};
