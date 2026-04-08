import { useEffect } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import CommandCenter from "@/pages/command-center";
import ArchonConsole from "@/pages/archon-console";
import Guilds from "@/pages/guilds";
import EvolutionArena from "@/pages/evolution-arena";
import TrustGovernance from "@/pages/trust-governance";
import SkillLibrary from "@/pages/skill-library";
import EscalationQueue from "@/pages/escalation-queue";

function AppRouter() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={CommandCenter} />
        <Route path="/archon" component={ArchonConsole} />
        <Route path="/guilds" component={Guilds} />
        <Route path="/evolution" component={EvolutionArena} />
        <Route path="/trust" component={TrustGovernance} />
        <Route path="/skills" component={SkillLibrary} />
        <Route path="/escalations" component={EscalationQueue} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router hook={useHashLocation}>
          <AppRouter />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
