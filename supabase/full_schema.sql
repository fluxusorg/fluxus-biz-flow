-- Full Schema for Fluxus Project Migration
-- Handles existing types and tables by dropping them first (CASCADE)

-- 1. Reset Schema (Drop everything first to ensure clean state)
DROP TRIGGER IF EXISTS trigger_update_stock_on_cargo ON public.record_cargos;
DROP FUNCTION IF EXISTS public.update_stock_on_cargo_insert CASCADE;
DROP TRIGGER IF EXISTS update_stock_products_updated_at ON public.stock_products;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
DROP FUNCTION IF EXISTS public.update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS public.is_master CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company_id CASCADE;

DROP TABLE IF EXISTS public.profile_edit_requests CASCADE;
DROP TABLE IF EXISTS public.record_cargos CASCADE;
DROP TABLE IF EXISTS public.material_records CASCADE;
DROP TABLE IF EXISTS public.stock_products CASCADE;
DROP TABLE IF EXISTS public.suppliers CASCADE;
DROP TABLE IF EXISTS public.vehicles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.companies CASCADE;

DROP TYPE IF EXISTS public.app_role;

-- 2. Base Schema (Tables & Types)
CREATE TYPE public.app_role AS ENUM ('master', 'employee');

CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  logo_url TEXT,
  headquarters_address TEXT,
  branch_addresses TEXT[] DEFAULT '{}',
  manager_name TEXT NOT NULL,
  manager_position TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'employee',
  full_name TEXT NOT NULL,
  position TEXT,
  operation_location TEXT,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('internal', 'external')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

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

CREATE TABLE public.material_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('entry', 'exit')),
  record_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  vehicle_brand TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  vehicle_plate TEXT NOT NULL,
  vehicle_id UUID REFERENCES public.vehicles(id),
  origin_type TEXT,
  origin_supplier_id UUID REFERENCES public.suppliers(id),
  destination_type TEXT,
  destination_supplier_id UUID REFERENCES public.suppliers(id),
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.record_cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES public.material_records(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit TEXT NOT NULL CHECK (unit IN ('m3', 'kg', 'ton', 'unidade')),
  stock_product_id UUID REFERENCES public.stock_products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.profile_edit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Security (RLS) & Helper Functions
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_cargos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID) RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT company_id FROM public.profiles WHERE id = _user_id $$;
CREATE OR REPLACE FUNCTION public.is_master(_user_id UUID) RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'master') $$;

-- Policies
CREATE POLICY "Users can view own company" ON public.companies FOR SELECT USING (id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can update own company" ON public.companies FOR UPDATE USING (id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Users can view profiles in same company" ON public.profiles FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can insert profiles" ON public.profiles FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Masters can delete employee profiles" ON public.profiles FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Users can view records in same company" ON public.material_records FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Employees can insert records" ON public.material_records FOR INSERT WITH CHECK (user_id = auth.uid() AND company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Users can update own records" ON public.material_records FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own records" ON public.material_records FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Users can view cargos for visible records" ON public.record_cargos FOR SELECT USING (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.company_id = get_user_company_id(auth.uid())));
CREATE POLICY "Users can insert cargos for own records" ON public.record_cargos FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.user_id = auth.uid()));
CREATE POLICY "Users can update cargos for own records" ON public.record_cargos FOR UPDATE USING (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.user_id = auth.uid()));
CREATE POLICY "Users can delete cargos for own records" ON public.record_cargos FOR DELETE USING (EXISTS (SELECT 1 FROM material_records mr WHERE mr.id = record_cargos.record_id AND mr.user_id = auth.uid()));

CREATE POLICY "Users can view vehicles in same company" ON public.vehicles FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can update vehicles" ON public.vehicles FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can delete vehicles" ON public.vehicles FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Users can view suppliers in same company" ON public.suppliers FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can update suppliers" ON public.suppliers FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can delete suppliers" ON public.suppliers FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Users can view stock in same company" ON public.stock_products FOR SELECT USING (company_id = get_user_company_id(auth.uid()));
CREATE POLICY "Masters can insert stock" ON public.stock_products FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can update stock" ON public.stock_products FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
CREATE POLICY "Masters can delete stock" ON public.stock_products FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Users can view own edit requests" ON public.profile_edit_requests FOR SELECT USING (profile_id = auth.uid() OR (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid())));
CREATE POLICY "Users can insert own edit requests" ON public.profile_edit_requests FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "Masters can update edit requests" ON public.profile_edit_requests FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

-- 4. Storage & Triggers
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true) ON CONFLICT DO NOTHING;

-- Drop storage policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'uploads' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view uploads" ON storage.objects FOR SELECT USING (bucket_id = 'uploads');
CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stock_products_updated_at BEFORE UPDATE ON public.stock_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_stock_on_cargo_insert() RETURNS TRIGGER AS $$
DECLARE op_type text;
BEGIN
  IF NEW.stock_product_id IS NOT NULL THEN
    SELECT operation_type INTO op_type FROM public.material_records WHERE id = NEW.record_id;
    IF op_type = 'entry' THEN UPDATE public.stock_products SET current_quantity = current_quantity + NEW.quantity, updated_at = now() WHERE id = NEW.stock_product_id;
    ELSIF op_type = 'exit' THEN UPDATE public.stock_products SET current_quantity = GREATEST(0, current_quantity - NEW.quantity), updated_at = now() WHERE id = NEW.stock_product_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trigger_update_stock_on_cargo AFTER INSERT ON public.record_cargos FOR EACH ROW EXECUTE FUNCTION public.update_stock_on_cargo_insert();
