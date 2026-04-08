import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Command,
  Brain,
  Shield,
  Dna,
  Lock,
  Boxes,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Command Center", icon: Command },
  { path: "/archon", label: "Archon", icon: Brain },
  { path: "/guilds", label: "Guilds", icon: Shield },
  { path: "/evolution", label: "Evolution", icon: Dna },
  { path: "/trust", label: "Trust", icon: Lock },
  { path: "/skills", label: "Skills", icon: Boxes },
  { path: "/escalations", label: "Escalations", icon: AlertTriangle },
];

function FluidLogo() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Fluid Enterprise Logo"
    >
      {/* Hexagonal shell */}
      <path
        d="M20 2L36.66 11.5V30.5L20 40L3.34 30.5V11.5L20 2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        opacity="0.6"
      />
      {/* Inner hexagon */}
      <path
        d="M20 9L30.39 14.5V25.5L20 31L9.61 25.5V14.5L20 9Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        opacity="0.3"
      />
      {/* Central node */}
      <circle cx="20" cy="20" r="2.5" fill="currentColor" opacity="0.9" />
      {/* Network nodes */}
      <circle cx="20" cy="9" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="29" cy="14.5" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="29" cy="25.5" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="20" cy="31" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="25.5" r="1.5" fill="currentColor" opacity="0.7" />
      <circle cx="11" cy="14.5" r="1.5" fill="currentColor" opacity="0.7" />
      {/* Connection lines from center to nodes */}
      <line x1="20" y1="20" x2="20" y2="9" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="20" y1="20" x2="29" y2="14.5" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="20" y1="20" x2="29" y2="25.5" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="20" y1="20" x2="20" y2="31" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="20" y1="20" x2="11" y2="25.5" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      <line x1="20" y1="20" x2="11" y2="14.5" stroke="currentColor" strokeWidth="0.75" opacity="0.4" />
      {/* Cross connections */}
      <line x1="20" y1="9" x2="29" y2="14.5" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="29" y1="14.5" x2="29" y2="25.5" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="29" y1="25.5" x2="20" y2="31" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="20" y1="31" x2="11" y2="25.5" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="11" y1="25.5" x2="11" y2="14.5" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
      <line x1="11" y1="14.5" x2="20" y2="9" stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
    </svg>
  );
}

export function AppSidebar() {
  const [location] = useLocation();

  const { data: dashboard } = useQuery<any>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 5000,
  });

  const currentGeneration = dashboard?.latestEvolution?.generationNumber ?? "—";

  return (
    <div
      className="fixed left-0 top-0 h-screen w-[260px] flex flex-col bg-sidebar border-r border-sidebar-border z-50"
      data-testid="app-sidebar"
    >
      {/* Logo area */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="text-cyan-400">
            <FluidLogo />
          </div>
          <div>
            <h1 className="text-[13px] font-semibold tracking-[0.08em] text-sidebar-foreground uppercase">
              Fluid Enterprise
            </h1>
            <p className="text-[10px] tracking-[0.04em] text-muted-foreground mt-0.5">
              Agent-First ERP
            </p>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto custom-scrollbar" data-testid="sidebar-nav">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location === "/" || location === ""
              : location.startsWith(item.path);

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`
                  flex items-center gap-3 px-3 py-2 rounded-md text-[13px] font-medium cursor-pointer transition-colors duration-150
                  ${
                    isActive
                      ? "bg-sidebar-accent text-cyan-400 border-l-2 border-cyan-400 -ml-[2px] pl-[14px]"
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }
                `}
                data-testid={`nav-${item.path === "/" ? "command-center" : item.path.slice(1)}`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
                {item.path === "/escalations" && dashboard?.pendingEscalations > 0 && (
                  <span className="ml-auto text-[10px] font-mono bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full tabular-nums">
                    {dashboard.pendingEscalations}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Separator */}
      <div className="mx-4 h-px bg-sidebar-border" />

      {/* System status */}
      <div className="px-5 py-4" data-testid="system-status">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-live" />
          <span className="text-[11px] text-sidebar-foreground/70 font-medium">
            System Online
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Generation
          </span>
          <span className="text-[11px] font-mono tabular-nums text-cyan-400" data-testid="generation-number">
            {currentGeneration}
          </span>
        </div>
      </div>
    </div>
  );
}
