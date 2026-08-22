import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { TopHeader } from "./TopHeader";
import { Footer } from "./Footer";
import { OnboardingDialog } from "@/components/onboarding/OnboardingDialog";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-10">
          {children}
        </main>
        <Footer />
        <BottomNav />
        <OnboardingDialog />
      </div>
    </div>
  );
}
