-- Enable realtime for seats table
ALTER PUBLICATION supabase_realtime ADD TABLE public.seats;

-- Enable realtime for students table
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;