import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  company_id: string;
  role: "master" | "employee";
  full_name: string;
  position: string | null;
  operation_location: string | null;
  photo_url: string | null;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  logo_url: string | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData as Profile);

      const { data: companyData } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profileData.company_id)
        .single();

      if (companyData) setCompany(companyData as Company);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          setTimeout(() => fetchProfile(session.user.id), 0);
        } else {
          setUser(null);
          setProfile(null);
          setCompany(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCompany(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, company, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
