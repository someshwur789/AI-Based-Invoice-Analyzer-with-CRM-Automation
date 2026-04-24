-- Create customers table for CRM
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vendors table for CRM
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  gst_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  vendor_id UUID REFERENCES public.vendors(id),
  customer_id UUID REFERENCES public.customers(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  subtotal DECIMAL(10,2) NOT NULL,
  gst_percentage DECIMAL(5,2),
  gst_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'validated', 'paid')),
  file_path TEXT,
  raw_ocr_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table
CREATE TABLE public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  rate DECIMAL(10,2) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (can be restricted later with auth)
CREATE POLICY "Allow all operations on customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_invoices_vendor_id ON public.invoices(vendor_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_date ON public.invoices(invoice_date);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.vendors (company_name, contact_name, email, phone, address, gst_number) VALUES
('TechCorp Solutions', 'John Smith', 'john@techcorp.com', '+1-555-0123', '123 Tech Street, Silicon Valley, CA', 'GST123456789'),
('Global Supplies Ltd', 'Sarah Johnson', 'sarah@globalsupplies.com', '+1-555-0456', '456 Supply Ave, Commerce City, TX', 'GST987654321');

INSERT INTO public.customers (company_name, contact_name, email, phone, address, gst_number) VALUES
('Acme Corporation', 'Mike Wilson', 'mike@acme.com', '+1-555-0789', '789 Business Blvd, Corporate City, NY', 'GST456789123'),
('StartupXYZ', 'Emma Davis', 'emma@startupxyz.com', '+1-555-0321', '321 Innovation St, Startup Valley, WA', 'GST789123456');

-- Get vendor and customer IDs for sample invoices
INSERT INTO public.invoices (invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, gst_percentage, gst_amount, total_amount, status) 
SELECT 
  'INV-2024-001',
  v.id,
  c.id,
  '2024-01-15',
  '2024-02-15',
  5000.00,
  18.00,
  900.00,
  5900.00,
  'validated'
FROM public.vendors v, public.customers c 
WHERE v.company_name = 'TechCorp Solutions' AND c.company_name = 'Acme Corporation'
LIMIT 1;

INSERT INTO public.invoices (invoice_number, vendor_id, customer_id, invoice_date, due_date, subtotal, gst_percentage, gst_amount, total_amount, status) 
SELECT 
  'INV-2024-002',
  v.id,
  c.id,
  '2024-01-20',
  '2024-02-20',
  3200.00,
  18.00,
  576.00,
  3776.00,
  'paid'
FROM public.vendors v, public.customers c 
WHERE v.company_name = 'Global Supplies Ltd' AND c.company_name = 'StartupXYZ'
LIMIT 1;