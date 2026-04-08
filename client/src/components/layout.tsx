import { AppSidebar } from "./app-sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[260px_1fr] h-[100dvh] overflow-hidden">
      <AppSidebar />
      <main className="overflow-y-auto custom-scrollbar bg-background">
        {children}
      </main>
    </div>
  );
}
