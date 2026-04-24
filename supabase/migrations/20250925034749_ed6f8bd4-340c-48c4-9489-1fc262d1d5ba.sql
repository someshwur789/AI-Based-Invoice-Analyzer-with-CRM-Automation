-- Update the invoices table to allow overdue and cancelled statuses
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add the updated constraint with all required status values
ALTER TABLE public.invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('pending', 'processed', 'validated', 'paid', 'overdue', 'cancelled'));