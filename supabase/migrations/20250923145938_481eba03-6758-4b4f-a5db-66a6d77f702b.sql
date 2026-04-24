-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', false);

-- Create storage policies for invoice files
CREATE POLICY "Users can upload invoice files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'invoices');

CREATE POLICY "Users can view invoice files" ON storage.objects
FOR SELECT USING (bucket_id = 'invoices');

CREATE POLICY "Users can update invoice files" ON storage.objects
FOR UPDATE USING (bucket_id = 'invoices');

CREATE POLICY "Users can delete invoice files" ON storage.objects
FOR DELETE USING (bucket_id = 'invoices');

-- Create automation_workflows table
CREATE TABLE public.automation_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on automation_workflows
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;

-- Create policy for automation_workflows
CREATE POLICY "Allow all operations on automation_workflows" 
ON public.automation_workflows 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create automation_tasks table
CREATE TABLE public.automation_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID REFERENCES public.automation_workflows(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_for TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on automation_tasks
ALTER TABLE public.automation_tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for automation_tasks
CREATE POLICY "Allow all operations on automation_tasks" 
ON public.automation_tasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add trigger for automation_workflows updated_at
CREATE TRIGGER update_automation_workflows_updated_at
BEFORE UPDATE ON public.automation_workflows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for automation_tasks updated_at
CREATE TRIGGER update_automation_tasks_updated_at
BEFORE UPDATE ON public.automation_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default overdue invoice workflow
INSERT INTO public.automation_workflows (name, description) VALUES 
('Overdue Invoice Follow-up', 'This automation will find all unpaid invoices that are past their due date and have not been followed up on yet. It will mark them as overdue and create a high-priority task for you to begin the follow-up process.');

-- Cleanup development seed data (customers, vendors, invoices)
DELETE FROM public.invoice_items WHERE invoice_id IN (
  SELECT id FROM public.invoices WHERE invoice_number IN ('INV-2024-001','INV-2024-002')
);
DELETE FROM public.invoices WHERE invoice_number IN ('INV-2024-001','INV-2024-002');
DELETE FROM public.vendors WHERE company_name IN ('TechCorp Solutions', 'Global Supplies Ltd');
DELETE FROM public.customers WHERE company_name IN ('Acme Corporation', 'StartupXYZ');