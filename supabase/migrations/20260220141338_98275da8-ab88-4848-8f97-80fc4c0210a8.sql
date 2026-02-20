
-- Fix ALL RLS policies: change from RESTRICTIVE to PERMISSIVE

-- companies
DROP POLICY IF EXISTS "Users can view own company" ON public.companies;
DROP POLICY IF EXISTS "Masters can update own company" ON public.companies;

CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can update own company" ON public.companies FOR UPDATE USING (id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

-- profiles
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;
DROP POLICY IF EXISTS "Masters can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can delete employee profiles" ON public.profiles;

CREATE POLICY "Users can view profiles in same company" ON public.profiles FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can insert profiles" ON public.profiles FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Masters can delete employee profiles" ON public.profiles FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

-- material_records
DROP POLICY IF EXISTS "Users can view records in same company" ON public.material_records;
DROP POLICY IF EXISTS "Employees can insert records" ON public.material_records;
DROP POLICY IF EXISTS "Users can update own records" ON public.material_records;
DROP POLICY IF EXISTS "Users can delete own records" ON public.material_records;

CREATE POLICY "Users can view records in same company" ON public.material_records FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Employees can insert records" ON public.material_records FOR INSERT WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update own records" ON public.material_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own records" ON public.material_records FOR DELETE USING (user_id = auth.uid());

-- record_cargos
DROP POLICY IF EXISTS "Users can view cargos for visible records" ON public.record_cargos;
DROP POLICY IF EXISTS "Users can insert cargos for own records" ON public.record_cargos;
DROP POLICY IF EXISTS "Users can update cargos for own records" ON public.record_cargos;
DROP POLICY IF EXISTS "Users can delete cargos for own records" ON public.record_cargos;

CREATE POLICY "Users can view cargos for visible records" ON public.record_cargos FOR SELECT USING (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can insert cargos for own records" ON public.record_cargos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.user_id = auth.uid()));
CREATE POLICY "Users can update cargos for own records" ON public.record_cargos FOR UPDATE USING (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.user_id = auth.uid()));
CREATE POLICY "Users can delete cargos for own records" ON public.record_cargos FOR DELETE USING (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.user_id = auth.uid()));

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create stock/products table
CREATE TABLE public.stock_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  unit TEXT NOT NULL DEFAULT 'unidade',
  current_quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  minimum_quantity DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.stock_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view stock in same company" ON public.stock_products FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can insert stock" ON public.stock_products FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can update stock" ON public.stock_products FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can delete stock" ON public.stock_products FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE TRIGGER update_stock_products_updated_at BEFORE UPDATE ON public.stock_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add stock_product_id to record_cargos (optional link)
ALTER TABLE public.record_cargos ADD COLUMN stock_product_id UUID REFERENCES public.stock_products(id) ON DELETE SET NULL;
