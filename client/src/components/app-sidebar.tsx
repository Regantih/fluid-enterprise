import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { AgentPulse } from "./AgentPulse";
import {
  LayoutDashboard,
  Database,
  GitBranch,
  Shield,
  Activity,
  ArrowRightLeft,
  DollarSign,
  ScrollText,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/registry", label: "Capability Registry", icon: Database },
  { href: "/composition", label: "Composition Engine", icon: GitBranch },
  { href: "/governance", label: "Governance Board", icon: Shield },
  { href: "/heartbeat", label: "Heartbeat Monitor", icon: Activity },
  { href: "/migration", label: "Migration Planner", icon: ArrowRightLeft },
  { href: "/costs", label: "Cost Dashboard", icon: DollarSign },
  { href: "/activity", label: "Activity Log", icon: ScrollText },
];

export function AppSidebar() {
  const [location] = useLocation();

  const { data: dashboard } = useQuery<any>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 10000,
  });

  const generation = dashboard?.kpis?.evolutionGeneration ?? 0;
  const fitness = dashboard?.kpis?.systemFitness ?? 0;

  return (
    <aside
      className="w-[260px] min-w-[260px] h-full flex flex-col bg-[hsl(228,28%,7%)] border-r border-[hsl(225,20%,12%)]"
      data-testid="app-sidebar"
    >
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-[hsl(225,20%,12%)]">
        <div className="flex items-center gap-3">
          <svg
            width="36"
            height="36"
            viewBox="0 0 36 36"
            fill="none"
            aria-label="Fluid Enterprise logo"
          >
            {/* Hexagonal outer */}
            <path
              d="M18 2L32 10V26L18 34L4 26V10L18 2Z"
              stroke="hsl(187,85%,48%)"
              strokeWidth="1.5"
              fill="none"
            />
            {/* Inner connected nodes */}
            <circle cx="18" cy="10" r="2" fill="hsl(187,85%,48%)" />
            <circle cx="10" cy="22" r="2" fill="hsl(187,85%,48%)" />
            <circle cx="26" cy="22" r="2" fill="hsl(187,85%,48%)" />
            <circle cx="18" cy="18" r="2.5" fill="hsl(160,60%,45%)" />
            {/* Connections */}
            <line x1="18" y1="10" x2="18" y2="18" stroke="hsl(187,85%,48%)" strokeWidth="1" opacity="0.6" />
            <line x1="10" y1="22" x2="18" y2="18" stroke="hsl(187,85%,48%)" strokeWidth="1" opacity="0.6" />
            <line x1="26" y1="22" x2="18" y2="18" stroke="hsl(187,85%,48%)" strokeWidth="1" opacity="0.6" />
            <line x1="18" y1="10" x2="10" y2="22" stroke="hsl(187,85%,48%)" strokeWidth="0.5" opacity="0.3" />
            <line x1="18" y1="10" x2="26" y2="22" stroke="hsl(187,85%,48%)" strokeWidth="0.5" opacity="0.3" />
            <line x1="10" y1="22" x2="26" y2="22" stroke="hsl(187,85%,48%)" strokeWidth="0.5" opacity="0.3" />
          </svg>
          <div>
            <div className="text-xs font-bold tracking-[0.15em] text-cyan-400">
              FLUID ENTERPRISE
            </div>
            <div className="text-[10px] text-slate-500 tracking-wide">
              Self-Evolving Platform
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? location === "/"
              : location.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm cursor-pointer transition-all mb-0.5 ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border-l-2 border-cyan-400 pl-[10px]"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border-l-2 border-transparent pl-[10px]"
                }`}
                data-testid={`nav-${item.href.replace("/", "") || "dashboard"}`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Agent Activity Feed */}
      <AgentPulse />

      {/* Bottom: Evolution Indicator */}
      <div className="px-4 py-4 border-t border-[hsl(225,20%,12%)]">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 pulse-live" />
          <span className="text-xs font-mono font-bold text-cyan-400 tracking-wide" data-testid="sidebar-generation">
            GENERATION {generation}
          </span>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-slate-500">FITNESS</span>
          <span className="text-xs font-mono text-cyan-400 tabular-nums" data-testid="sidebar-fitness">
            {fitness.toFixed(3)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[10px] text-emerald-400">System Online</span>
        </div>
      </div>
    </aside>
  );
}
