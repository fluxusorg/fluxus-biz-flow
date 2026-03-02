import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Logo from "@/components/Logo";

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [form, setForm] = useState({ password: "", confirmPassword: "" });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Senha atualizada com sucesso!");
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center">
          <Logo size="lg" className="flex-col" />
        </div>

        <Card className="border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <h2 className="text-2xl font-semibold font-display">Redefinir Senha</h2>
            <p className="text-muted-foreground text-sm">Defina uma nova senha para sua conta</p>
          </CardHeader>
          <CardContent>
            {!hasSession ? (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>Abra o link recebido no seu e-mail para continuar a redefinição.</p>
                <Link to="/auth" className="text-accent font-medium hover:underline">
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nova senha</Label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Confirmar nova senha</Label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                    placeholder="Repita a senha"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar nova senha"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

