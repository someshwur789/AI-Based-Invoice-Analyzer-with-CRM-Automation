import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/DashboardStats";
import { Button } from "@/components/ui/button";
import { Upload, FileText, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const Dashboard = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Analytics Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor your invoice processing and CRM integration
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline" className="shadow-sm">
            <Link to="/invoices">
              <FileText className="w-4 h-4 mr-2" />
              View Invoices
            </Link>
          </Button>
          <Button asChild className="shadow-corporate">
            <Link to="/upload">
              <Upload className="w-4 h-4 mr-2" />
              Upload Invoice
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <DashboardStats />

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends Chart */}
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-corporate-blue" />
              Revenue Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DashboardRevenueChart />
          </CardContent>
        </Card>

        {/* Recent Activity (live from Supabase) */}
        <RecentActivityCard />
      </div>

      {/* Quick Actions */}
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/upload" className="flex flex-col items-center gap-2 text-center">
                <Upload className="w-6 h-6 text-corporate-blue" />
                <div>
                  <div className="font-medium">Process Invoice</div>
                  <div className="text-xs text-muted-foreground">Upload and analyze</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/customers" className="flex flex-col items-center gap-2 text-center">
                <FileText className="w-6 h-6 text-success" />
                <div>
                  <div className="font-medium">Manage CRM</div>
                  <div className="text-xs text-muted-foreground">Customers & vendors</div>
                </div>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4">
              <Link to="/analytics" className="flex flex-col items-center gap-2 text-center">
                <TrendingUp className="w-6 h-6 text-warning" />
                <div>
                  <div className="font-medium">View Analytics</div>
                  <div className="text-xs text-muted-foreground">Reports & insights</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

// Recent activity component fetching latest invoice updates as an activity feed
function RecentActivityCard() {
  const [activities, setActivities] = useState<Array<{ action: string; time: string; status: "success" | "info" }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("invoice_number,status,updated_at")
          .order("updated_at", { ascending: false })
          .limit(6);

        if (error) throw error;

        const mapped = (data || []).map((row) => {
          const status: "success" | "info" = row.status === "paid" ? "success" : "info";
          const action = row.status === "paid"
            ? `Invoice ${row.invoice_number} paid`
            : row.status === "validated"
              ? `Invoice ${row.invoice_number} validated`
              : row.status === "processed"
                ? `Invoice ${row.invoice_number} processed`
                : `Invoice ${row.invoice_number} created`;
          const time = new Date(row.updated_at as unknown as string).toLocaleString();
          return { action, time, status };
        });

        setActivities(mapped);
      } finally {
        setLoading(false);
      }
    };

    fetchRecent();
  }, []);

  return (
    <Card className="shadow-card border-border">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
          {!loading && activities.length === 0 && (
            <div className="text-sm text-muted-foreground">No recent activity</div>
          )}
          {activities.map((activity, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
              <div className={`w-2 h-2 rounded-full mt-2 ${activity.status === "success" ? "bg-success" : "bg-info"}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Dashboard Revenue Chart Component
function DashboardRevenueChart() {
  const [data, setData] = useState<Array<{ month: string; revenue: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('total_amount, created_at')
          .eq('status', 'paid');
        
        if (error) throw error;

        // Group by month
        const monthlyData: Record<string, number> = {};
        (invoices || []).forEach((invoice: any) => {
          const month = new Date(invoice.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          monthlyData[month] = (monthlyData[month] || 0) + Number(invoice.total_amount);
        });

        const chartData = Object.entries(monthlyData)
          .map(([month, revenue]) => ({ month, revenue }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
          .slice(-4); // Last 4 months for dashboard

        setData(chartData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
          <Line type="monotone" dataKey="revenue" stroke="hsl(var(--corporate-blue))" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}