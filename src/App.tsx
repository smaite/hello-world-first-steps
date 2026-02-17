import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import { DevModeToggle } from "@/components/dev/DevModeToggle";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Exchange from "./pages/Exchange";
import CashTracker from "./pages/CashTracker";
import Customers from "./pages/Customers";
import CreditManagement from "./pages/CreditManagement";
import BankAccounts from "./pages/BankAccounts";
import Transactions from "./pages/Transactions";
import DailyReports from "./pages/DailyReports";
import Settings from "./pages/Settings";
import MonthlyReports from "./pages/MonthlyReports";
import StaffManagement from "./pages/StaffManagement";
import StaffSalary from "./pages/StaffSalary";
import Expenses from "./pages/Expenses";
import UserActivity from "./pages/UserActivity";
import DeductionsReceivings from "./pages/DeductionsReceivings";
import EditProfile from "./pages/EditProfile";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <DevModeToggle />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/exchange" element={<Exchange />} />
                <Route path="/cash-tracker" element={<CashTracker />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/credits" element={<CreditManagement />} />
                <Route path="/bank-accounts" element={<BankAccounts />} />
                <Route path="/reports/daily" element={<DailyReports />} />
                <Route path="/reports/monthly" element={<MonthlyReports />} />
                <Route path="/reports/transactions" element={<Transactions />} />
                <Route path="/expenses" element={<DeductionsReceivings />} />
                <Route path="/general-expenses" element={<Expenses filterCategories={['general', 'transport', 'supplies', 'utilities', 'maintenance', 'salary', 'rent', 'other']} hideDeductionButtons={true} title="Expenses" />} />
                <Route path="/staff" element={<StaffManagement />} />
                <Route path="/staff/salary" element={<StaffSalary />} />
                <Route path="/activity" element={<UserActivity />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/subscriptions" element={<Subscription />} />
                <Route path="/profile" element={<EditProfile />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
