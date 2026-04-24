import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, DollarSign, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface DashboardStatsProps {
  className?: string;
}

interface Stats {
  totalInvoices: number;
  totalCustomers: number;
  totalRevenue: number;
  pendingInvoices: number;
}

export function DashboardStats({ className }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalInvoices: 0,
    totalCustomers: 0,
    totalRevenue: 0,
    pendingInvoices: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch total invoices
        const { count: invoiceCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true });

        // Fetch total customers
        const { count: customerCount } = await supabase
          .from('customers')
          .select('*', { count: 'exact', head: true });

        // Fetch total revenue
        const { data: revenueData } = await supabase
          .from('invoices')
          .select('total_amount')
          .eq('status', 'paid');

        const totalRevenue = revenueData?.reduce((sum, invoice) => 
          sum + parseFloat(invoice.total_amount?.toString() || '0'), 0) || 0;

        // Fetch pending invoices
        const { count: pendingCount } = await supabase
          .from('invoices')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'processed', 'validated']);

        setStats({
          totalInvoices: invoiceCount || 0,
          totalCustomers: customerCount || 0,
          totalRevenue,
          pendingInvoices: pendingCount || 0,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Invoices",
      value: loading ? "..." : stats.totalInvoices.toString(),
      icon: FileText,
      color: "text-corporate-blue",
      bgColor: "bg-corporate-light-blue/10",
    },
    {
      title: "Active Customers",
      value: loading ? "..." : stats.totalCustomers.toString(),
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Total Revenue",
      value: loading ? "..." : `$${stats.totalRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      icon: DollarSign,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Pending Invoices",
      value: loading ? "..." : stats.pendingInvoices.toString(),
      icon: AlertCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
      {statCards.map((stat, index) => (
        <Card key={index} className="border-border shadow-card hover:shadow-lg transition-shadow duration-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <div className={`w-8 h-8 rounded-lg ${stat.bgColor} flex items-center justify-center`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {loading ? "Loading..." : "Updated just now"}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}