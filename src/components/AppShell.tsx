import React, { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileDrawer } from './MobileDrawer';
import { DashboardHeader } from './DashboardHeader';
import { ToastNotificationSystem } from './ToastNotificationSystem';
import { InactivityGuard } from './auth/InactivityGuard';

interface AppShellProps {
  children: ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bankroll: any;
  allTimeStats: any;
  bookmakerExposure: any;
  bookmakerBalances: any;
  getBookmakerStyle: (b: string) => any;
  showBalanceFeedback: boolean;
  balanceDelta: number;
  setAdjustingBookmaker: (b: string | null) => void;
  setAdjustmentValue: (v: string) => void;
  setIsBankrollMenuOpen: (v: boolean) => void;
  signOut: () => Promise<void>;
  formatCurrency: (v: number) => string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (v: boolean) => void;
  successToast: any;
  user: any;
  showToast: (m: string, t?: any) => void;
}

export function AppShell({
  children,
  activeTab,
  setActiveTab,
  bankroll,
  allTimeStats,
  bookmakerExposure,
  bookmakerBalances,
  getBookmakerStyle,
  showBalanceFeedback,
  balanceDelta,
  setAdjustingBookmaker,
  setAdjustmentValue,
  setIsBankrollMenuOpen,
  signOut,
  formatCurrency,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  successToast,
  user,
  showToast
}: AppShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row text-text-main bg-bg font-sans">
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bankroll={bankroll}
        allTimeStats={allTimeStats}
        bookmakerExposure={bookmakerExposure}
        bookmakerBalances={bookmakerBalances}
        getBookmakerStyle={getBookmakerStyle}
        showBalanceFeedback={showBalanceFeedback}
        balanceDelta={balanceDelta}
        setAdjustingBookmaker={setAdjustingBookmaker}
        setAdjustmentValue={setAdjustmentValue}
        setIsBankrollMenuOpen={setIsBankrollMenuOpen}
        signOut={signOut}
        formatCurrency={formatCurrency}
      />

      <MobileHeader 
        bankrollName={bankroll.name}
        setIsBankrollMenuOpen={setIsBankrollMenuOpen}
        signOut={signOut}
        showBalanceFeedback={showBalanceFeedback}
        balanceDelta={balanceDelta}
        currentBalance={allTimeStats.currentBalance}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1 overflow-y-auto bg-bg pb-20 lg:pb-0">
        <DashboardHeader 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <div className="p-4 md:p-10 max-w-7xl mx-auto min-h-[calc(100vh-6rem)]">
          {children}
        </div>
      </main>

      <MobileBottomNav 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
      />

      <MobileDrawer 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        setActiveTab={setActiveTab}
      />

      <ToastNotificationSystem successToast={successToast} />
      <InactivityGuard user={user} signOut={signOut} showToast={showToast} />
    </div>
  );
}
