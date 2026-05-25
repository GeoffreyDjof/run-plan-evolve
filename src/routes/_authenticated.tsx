import { createFileRoute, Outlet, redirect, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile } from "@/lib/api/training.functions";
import { Home, Calendar, Sparkles, BarChart3, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/login", search: { redirect: location.href } as any });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const fetchProfile = useServerFn(getMyProfile);
  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => fetchProfile(),
  });

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarded && path !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [profile, isLoading, path, navigate]);

  const hideNav = path === "/onboarding";

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      {!hideNav && <BottomNav />}
    </div>
  );
}

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/dashboard", label: "Today", icon: Home },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/generator", label: "Generate", icon: Sparkles },
    { to: "/progress", label: "Progress", icon: BarChart3 },
    { to: "/settings", label: "Settings", icon: SettingsIcon },
  ] as const;
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto max-w-md grid grid-cols-5 px-1 py-1.5 safe-area-bottom">
        {items.map(({ to, label, icon: Icon }) => {
          const active = path.startsWith(to);
          return (
            <Link key={to} to={to} className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-lg transition-colors",
              active ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}>
              <Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
