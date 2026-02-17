import { useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeftRight,
  LayoutDashboard,
  Users,
  Banknote,
  Building2,
  FileText,
  Settings,
  UserCog,
  LogOut,
  Wallet,
  CreditCard,
  Receipt,
  CalendarDays,
  Activity,
} from "lucide-react";

const AppSidebar = () => {
  const location = useLocation();
  const { profile, role, signOut, hasPermission } = useAuth();

  const mainMenuItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    { title: "Exchange", url: "/exchange", icon: ArrowLeftRight },
    { title: "Cash Tracker", url: "/cash-tracker", icon: Wallet },
  ];

  const managementItems = [
    {
      title: "Customers",
      url: "/customers",
      icon: Users,
      permission: "view_customers",
    },
    {
      title: "Credit Management",
      url: "/credits",
      icon: CreditCard,
      permission: "view_customer_credit",
    },
    {
      title: "Bank Accounts",
      url: "/bank-accounts",
      icon: Building2,
      permission: "view_bank_accounts",
    },
  ];

  const reportItems = [
    {
      title: "Daily Reports",
      url: "/reports/daily",
      icon: FileText,
      permission: "view_daily_reports",
    },
    {
      title: "Monthly Reports",
      url: "/reports/monthly",
      icon: CalendarDays,
      permission: "view_daily_reports",
    },
    {
      title: "Transactions",
      url: "/reports/transactions",
      icon: Banknote,
      permission: "view_transactions",
    },
    {
      title: "Expenses",
      url: "/general-expenses",
      icon: Receipt,
      permission: "view_expenses",
    },
    {
      title: "Deductions & Receivings",
      url: "/expenses",
      icon: Receipt,
      permission: "view_expenses",
    },
  ];

  const adminItems = [
    { title: "Staff Management", url: "/staff", icon: UserCog },
    { title: "Staff Salary", url: "/staff/salary", icon: Wallet },
    { title: "User Activity", url: "/activity", icon: Activity },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar className="pb-safe">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg  text-primary-foreground">
            <img src="/favicon.png" alt="Madani Money Exchange" className="h-10 w-10 full" />
          </div>
          <div>
            <h2 className="font-semibold">Madani Exchange</h2>
            <p className="text-xs text-muted-foreground">NPR ⇄ INR</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {managementItems
                .filter((item) => hasPermission(item.permission))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Reports</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {reportItems
                .filter((item) => hasPermission(item.permission))
                .map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(role === "superuser" || role === "owner" || role === "manager") && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive(item.url)}>
                      <Link to={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-4 pb-safe">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">{profile?.full_name}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={signOut}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;
