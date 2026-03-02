import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, User, LogIn, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import Logo from "@/components/Logo";
import heroBg from "@/assets/hero-bg.jpg";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

const LoginPage = () => {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error("Erro ao entrar: " + error);
    } else {
      toast.success("Login realizado com sucesso!");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo });
    setResetLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Enviamos um e-mail para redefinir sua senha.");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Hero */}
      <div
        className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12"
        style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
      >
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 text-primary-foreground max-w-lg">
          <div className="mb-6">
            <Logo size="xl" variant="white" />
          </div>
          <p className="text-xl opacity-90 leading-relaxed">
            Gestão inteligente de entrada e saída de materiais. 
            Controle total das operações logísticas da sua empresa.
          </p>
          <div className="mt-8 flex gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold">100%</div>
              <div className="text-sm opacity-75">Digital</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">24/7</div>
              <div className="text-sm opacity-75">Disponível</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">GPS</div>
              <div className="text-sm opacity-75">Rastreável</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <div className="text-center mb-8 lg:hidden">
            <div className="flex justify-center mb-4">
              <Logo size="lg" className="flex-col" />
            </div>
            <p className="text-muted-foreground mt-1">Gestão de materiais</p>
          </div>

          <Card className="border-0 shadow-xl">
            <CardHeader className="text-center pb-2">
              <h2 className="text-2xl font-semibold font-display">Entrar</h2>
              <p className="text-muted-foreground text-sm">Acesse com suas credenciais</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="company" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="company" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Empresa
                  </TabsTrigger>
                  <TabsTrigger value="employee" className="flex items-center gap-2">
                    <User className="w-4 h-4" /> Funcionário
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="company">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="company-email">E-mail da empresa</Label>
                      <Input id="company-email" type="email" placeholder="gerente@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-password">Senha</Label>
                      <Input id="company-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground hover:underline">
                            Esqueci minha senha
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-display">Redefinir senha</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label>E-mail</Label>
                              <Input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                                placeholder="seuemail@empresa.com"
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={resetLoading}>
                              {resetLoading ? "Enviando..." : "Enviar link"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                      <Dialog>
                        <DialogTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground hover:underline">
                            Esqueci meu e-mail
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-display">Recuperar e-mail</DialogTitle>
                          </DialogHeader>
                          <div className="text-sm text-muted-foreground space-y-2">
                            <p>Procure por mensagens do Fluxus/Supabase na sua caixa de e-mail (convite/confirmação).</p>
                            <p>Se você ainda não encontrar, peça ao gerenciador da empresa para confirmar o e-mail cadastrado.</p>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar como Gerenciador"} <LogIn className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="employee">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emp-email">E-mail</Label>
                      <Input id="emp-email" type="email" placeholder="funcionario@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emp-password">Senha</Label>
                      <Input id="emp-password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="text-sm">
                      <Dialog>
                        <DialogTrigger asChild>
                          <button type="button" className="text-muted-foreground hover:text-foreground hover:underline">
                            Esqueci minha senha
                          </button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="font-display">Redefinir senha</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleResetPassword} className="space-y-4">
                            <div className="space-y-2">
                              <Label>E-mail</Label>
                              <Input
                                type="email"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                required
                                placeholder="seuemail@empresa.com"
                              />
                            </div>
                            <Button type="submit" className="w-full" disabled={resetLoading}>
                              {resetLoading ? "Enviando..." : "Enviar link"}
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar como Funcionário"} <LogIn className="w-4 h-4 ml-2" />
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Sua empresa ainda não tem conta?{" "}
                  <Link to="/register" className="text-accent font-medium hover:underline">
                    Cadastre-se <ArrowRight className="w-3 h-3 inline" />
                  </Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
