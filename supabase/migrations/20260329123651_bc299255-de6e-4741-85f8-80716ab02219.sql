-- Create project_documents table to track uploaded files
CREATE TABLE public.project_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  extracted_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.project_documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own documents" ON public.project_documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own documents" ON public.project_documents FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) VALUES ('project-documents', 'project-documents', false);

-- Storage RLS policies
CREATE POLICY "Users can upload project documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'project-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Users can view their project documents" ON storage.objects FOR SELECT USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their project documents" ON storage.objects FOR DELETE USING (bucket_id = 'project-documents' AND auth.role() = 'authenticated');