import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Shield, MapPin, BarChart3, Users, Truck, Clock, CheckCircle2 } from "lucide-react";
import logoFull from "@/assets/logo-full.png";
import logoIcon from "@/assets/logo-icon.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20">
          <div className="flex items-center gap-3">
            <img src={logoIcon} alt="Fluxus" className="h-10 w-10 object-contain" />
            <span className="text-2xl font-bold font-display text-foreground">Fluxus</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Como Funciona</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Vantagens</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">Começar Grátis <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <CheckCircle2 className="w-4 h-4" /> Plataforma de gestão logística #1
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold font-display tracking-tight text-foreground leading-tight">
            Controle total de{" "}
            <span className="text-gradient">entrada e saída</span>
            <br />de materiais
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Gerencie operações logísticas com rastreamento GPS, fotos em tempo real e relatórios completos. 
            Tudo em uma plataforma moderna e segura.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register">
              <Button size="lg" className="text-base px-8 py-6 shadow-lg">
                Cadastrar Minha Empresa <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="outline" size="lg" className="text-base px-8 py-6">
                Já tenho conta
              </Button>
            </Link>
          </div>
          <div className="mt-16 flex items-center justify-center gap-8 sm:gap-16 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold font-display text-primary">100%</div>
              <div className="text-sm text-muted-foreground mt-1">Digital</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div>
              <div className="text-3xl sm:text-4xl font-bold font-display text-primary">24/7</div>
              <div className="text-sm text-muted-foreground mt-1">Disponível</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div>
              <div className="text-3xl sm:text-4xl font-bold font-display text-primary">GPS</div>
              <div className="text-sm text-muted-foreground mt-1">Rastreável</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display">Recursos Poderosos</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Tudo o que sua empresa precisa para controlar operações logísticas com eficiência.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Truck, title: "Registro de Materiais", desc: "Entrada e saída com dados completos do transporte, carga e motorista." },
              { icon: MapPin, title: "Geolocalização", desc: "Rastreamento GPS automático em cada operação registrada." },
              { icon: Shield, title: "Segurança", desc: "Controle de acesso por empresa com níveis de permissão." },
              { icon: Users, title: "Gestão de Equipe", desc: "Cadastre funcionários e monitore suas atividades em tempo real." },
              { icon: BarChart3, title: "Controle de Estoque", desc: "Acompanhe seu inventário com entradas e saídas contabilizadas automaticamente." },
              { icon: Clock, title: "Histórico Completo", desc: "Todos os registros organizados e pesquisáveis com filtros avançados." },
            ].map((f) => (
              <Card key={f.title} className="border shadow-sm hover:shadow-lg transition-all group">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-xl gradient-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <f.icon className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold font-display mb-2">{f.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold font-display">Como Funciona</h2>
            <p className="mt-4 text-muted-foreground text-lg">Comece em 3 passos simples</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Cadastre sua Empresa", desc: "Crie sua conta master com dados da empresa, CNPJ e endereço." },
              { step: "02", title: "Adicione sua Equipe", desc: "Cadastre funcionários com login individual para operar na plataforma." },
              { step: "03", title: "Registre Operações", desc: "Funcionários registram entradas e saídas com foto, GPS e dados da carga." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary-foreground font-display">{s.step}</span>
                </div>
                <h3 className="text-lg font-semibold font-display mb-2">{s.title}</h3>
                <p className="text-muted-foreground text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={logoIcon} alt="Fluxus" className="h-14 w-14 object-contain" />
            <span className="text-3xl font-bold font-display text-foreground">Fluxus</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold font-display">Pronto para transformar sua logística?</h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Comece a usar o Fluxus agora e tenha controle total das operações da sua empresa.
          </p>
          <div className="mt-8">
            <Link to="/register">
              <Button size="lg" className="text-base px-10 py-6 shadow-lg">
                Cadastrar Minha Empresa <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoIcon} alt="Fluxus" className="h-8 w-8 object-contain" />
            <span className="font-bold font-display text-foreground">Fluxus</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Fluxus. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
