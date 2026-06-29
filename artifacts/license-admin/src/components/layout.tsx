import { Link, useLocation } from "wouter";
import { LayoutDashboard, KeyRound, PlusCircle, Settings, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/licenses", label: "Licences", icon: KeyRound },
    { href: "/licenses/generate", label: "Générer", icon: PlusCircle },
  ];

  return (
    <div className="flex min-h-[100dvh] w-full bg-background">
      <aside className="w-64 flex-shrink-0 border-r bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border/50">
          <ShieldCheck className="w-6 h-6 mr-3 text-sidebar-primary" />
          <span className="font-bold text-lg tracking-tight">DMH Admin</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border/50 text-xs text-sidebar-foreground/50">
          DMH Suite Manager v1.0
        </div>
      </aside>
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-8 max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
