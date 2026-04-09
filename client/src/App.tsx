import { useEffect } from "react";
import { Switch, Route, Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import CapabilityRegistry from "@/pages/capability-registry";
import CompositionEngine from "@/pages/composition-engine";
import GovernanceBoard from "@/pages/governance-board";
import HeartbeatMonitor from "@/pages/heartbeat-monitor";
import MigrationPlanner from "@/pages/migration-planner";
import CostDashboard from "@/pages/cost-dashboard";
import ActivityLog from "@/pages/activity-log";
import AgentWorkbench from "@/pages/agent-workbench";
import NotFound from "@/pages/not-found";

function App() {
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Router hook={useHashLocation}>
        <Layout>
          <Switch>
            <Route path="/agent-workbench" component={AgentWorkbench} />
            <Route path="/" component={Dashboard} />
            <Route path="/registry" component={CapabilityRegistry} />
            <Route path="/composition" component={CompositionEngine} />
            <Route path="/governance" component={GovernanceBoard} />
            <Route path="/heartbeat" component={HeartbeatMonitor} />
            <Route path="/migration" component={MigrationPlanner} />
            <Route path="/costs" component={CostDashboard} />
            <Route path="/activity" component={ActivityLog} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Router>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
