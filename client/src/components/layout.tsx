import { type ReactNode } from "react";
import { AppSidebar } from "./app-sidebar";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex" data-testid="app-layout">
      <AppSidebar />
      <main
        className="ml-[260px] flex-1 h-screen overflow-y-auto custom-scrollbar bg-background"
        data-testid="main-content"
      >
        {children}
      </main>
    </div>
  );
}
