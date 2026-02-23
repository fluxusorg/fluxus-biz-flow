
-- Vehicles table (pre-registered by manager)
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plate TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vehicles in same company" ON public.vehicles
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Masters can insert vehicles" ON public.vehicles
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Masters can update vehicles" ON public.vehicles
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Masters can delete vehicles" ON public.vehicles
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

-- Suppliers table (internal and external, pre-registered by manager)
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('internal', 'external')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view suppliers in same company" ON public.suppliers
  FOR SELECT USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Masters can insert suppliers" ON public.suppliers
  FOR INSERT WITH CHECK (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Masters can update suppliers" ON public.suppliers
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

CREATE POLICY "Masters can delete suppliers" ON public.suppliers
  FOR DELETE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));

-- Add vehicle_id and supplier fields to material_records
ALTER TABLE public.material_records
  ADD COLUMN vehicle_id UUID REFERENCES public.vehicles(id),
  ADD COLUMN origin_type TEXT,
  ADD COLUMN origin_supplier_id UUID REFERENCES public.suppliers(id),
  ADD COLUMN destination_type TEXT,
  ADD COLUMN destination_supplier_id UUID REFERENCES public.suppliers(id);

-- Profile edit requests table (for employee approval workflow)
CREATE TABLE public.profile_edit_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requested_changes JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profile_edit_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own edit requests" ON public.profile_edit_requests
  FOR SELECT USING (profile_id = auth.uid() OR (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid())));

CREATE POLICY "Users can insert own edit requests" ON public.profile_edit_requests
  FOR INSERT WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Masters can update edit requests" ON public.profile_edit_requests
  FOR UPDATE USING (company_id = get_user_company_id(auth.uid()) AND is_master(auth.uid()));
