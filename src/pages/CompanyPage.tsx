import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Hash } from "lucide-react";

const CompanyPage = () => {
  const { company } = useAuth();

  if (!company) return null;

  return (
    <AppLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold font-display">Dados da Empresa</h1>
          <p className="text-muted-foreground mt-1">Informações da sua organização</p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl gradient-primary flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold font-display">{company.name}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Hash className="w-3 h-3" /> {company.cnpj}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default CompanyPage;
