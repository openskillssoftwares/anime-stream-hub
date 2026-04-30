import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Search, LogOut, User as UserIcon, Sparkles, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const [q, setQ] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    api.me().then((m) => setIsAdmin(m.is_admin)).catch(() => setIsAdmin(false));
  }, [user]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (q.trim()) navigate(`/?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="fixed top-0 inset-x-0 z-50 glass border-b border-border/50">
      <div className="container flex items-center gap-6 h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <Sparkles className="w-5 h-5 text-primary transition-transform group-hover:rotate-12" />
          <span className="font-display text-xl font-semibold tracking-tight">Lumen<span className="text-primary">.</span></span>
        </Link>

        <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
          <a href="/#trending" className="hover:text-foreground transition-colors">Trending</a>
          <a href="/#new" className="hover:text-foreground transition-colors">New</a>
          <a href="/#season" className="hover:text-foreground transition-colors">This Season</a>
          <a href="/#top" className="hover:text-foreground transition-colors">Top 10</a>
        </nav>

        <form onSubmit={onSearch} className="flex-1 max-w-md ml-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search anime…"
            className="pl-9 bg-secondary/50 border-border/60 focus-visible:ring-primary"
          />
        </form>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full relative">
                <UserIcon className="w-4 h-4" />
                {isAdmin && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary shadow-glow" />}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 text-xs text-muted-foreground truncate">{user.email}</div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin")}>
                  <ShieldCheck className="w-4 h-4 mr-2 text-primary" /> Admin console
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild variant="default" size="sm" className="bg-gradient-ember text-primary-foreground hover:opacity-90 shadow-glow">
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
};
