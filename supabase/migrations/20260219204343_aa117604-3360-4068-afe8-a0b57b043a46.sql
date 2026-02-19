
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('master', 'employee');

-- Create companies table
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

-- Create profiles table (linked to auth.users)
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

-- Create material records table
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
  photo_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cargos table (multiple cargos per record)
CREATE TABLE public.record_cargos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  record_id UUID NOT NULL REFERENCES public.material_records(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
  unit TEXT NOT NULL CHECK (unit IN ('m3', 'kg', 'ton', 'unidade')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_cargos ENABLE ROW LEVEL SECURITY;

-- Helper function: get company_id for a user
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- Helper function: check if user is master
CREATE OR REPLACE FUNCTION public.is_master(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND role = 'master'
  )
$$;

-- Companies RLS: masters can read/update their own company
CREATE POLICY "Users can view own company" ON public.companies
  FOR SELECT USING (id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Masters can update own company" ON public.companies
  FOR UPDATE USING (id = public.get_user_company_id(auth.uid()) AND public.is_master(auth.uid()));

-- Profiles RLS
CREATE POLICY "Users can view profiles in same company" ON public.profiles
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Masters can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    company_id = public.get_user_company_id(auth.uid()) AND public.is_master(auth.uid())
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Masters can delete employee profiles" ON public.profiles
  FOR DELETE USING (
    company_id = public.get_user_company_id(auth.uid()) AND public.is_master(auth.uid())
  );

-- Material records RLS
CREATE POLICY "Users can view records in same company" ON public.material_records
  FOR SELECT USING (company_id = public.get_user_company_id(auth.uid()));

CREATE POLICY "Employees can insert records" ON public.material_records
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND company_id = public.get_user_company_id(auth.uid())
  );

CREATE POLICY "Users can update own records" ON public.material_records
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own records" ON public.material_records
  FOR DELETE USING (user_id = auth.uid());

-- Record cargos RLS
CREATE POLICY "Users can view cargos for visible records" ON public.record_cargos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.material_records mr
      WHERE mr.id = record_id AND mr.company_id = public.get_user_company_id(auth.uid())
    )
  );

CREATE POLICY "Users can insert cargos for own records" ON public.record_cargos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.material_records mr
      WHERE mr.id = record_id AND mr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update cargos for own records" ON public.record_cargos
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.material_records mr
      WHERE mr.id = record_id AND mr.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete cargos for own records" ON public.record_cargos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.material_records mr
      WHERE mr.id = record_id AND mr.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
