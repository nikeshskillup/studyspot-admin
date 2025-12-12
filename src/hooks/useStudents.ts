import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tables, TablesInsert } from '@/integrations/supabase/types';

type Student = Tables<'students'>;
type StudentInsert = TablesInsert<'students'>;

export type StudentsQueryParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: keyof Student | 'created_at';
  sortDir?: 'asc' | 'desc';
  status?: 'active' | 'inactive' | null;
  fee_status?: 'paid' | 'pending' | 'overdue' | null;
};

export const useStudents = (params: StudentsQueryParams = {}) => {
  const { page = 1, pageSize = 20, search, sortBy = 'created_at', sortDir = 'desc', status, fee_status } = params;

  return useQuery({
    queryKey: ['students', params],
    queryFn: async () => {
      let query = supabase.from('students').select('*', { count: 'exact' });

      if (status) query = query.eq('status', status);
      if (fee_status) query = query.eq('fee_status', fee_status);

      if (search && search.trim()) {
        const s = `%${search.trim()}%`;
        query = query.or(`name.ilike.${s},ss_id.ilike.${s},phone.ilike.${s}`);
      }

      query = query.order(sortBy as string, { ascending: sortDir === 'asc' });

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await query.range(from, to);

      if (error) throw error;
      return { data: data as Student[] || [], count: count ?? 0 };
    },
  });
};

export const useAddStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (student: StudentInsert) => {
      const { data, error } = await supabase
        .from('students')
        .insert(student)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student registered successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add student: ${error.message}`);
    },
  });
};

export const useUpdateStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Student> }) => {
      const { data, error } = await supabase
        .from('students')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student updated successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update student: ${error.message}`);
    },
  });
};

export const useDeleteStudent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
      toast.success('Student deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete student: ${error.message}`);
    },
  });
};

export const useGenerateSsId = () => {
  return useQuery({
    queryKey: ['next-ss-id'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('ss_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        return 'SS1001';
      }

      const lastId = data[0].ss_id;
      const numPart = parseInt(lastId.replace('SS', ''), 10);
      return `SS${(numPart + 1).toString().padStart(4, '0')}`;
    },
  });
};
