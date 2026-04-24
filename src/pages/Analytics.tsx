import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/components/DashboardStats";
import { BarChart3, TrendingUp, PieChart, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Cell, BarChart, Bar, Pie } from 'recharts';

const Analytics = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
        <p className="text-muted-foreground mt-1">
          Comprehensive insights into your invoice processing and CRM data
        </p>
      </div>

      {/* Overview Stats */}
      <DashboardStats />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trends */}
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-corporate-blue" />
              Revenue Trends (Monthly)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>

        {/* Invoice Status Distribution */}
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-success" />
              Invoice Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusPieChart />
          </CardContent>
        </Card>

        {/* GST Collection Summary */}
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-warning" />
              GST Collection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GSTBarChart />
          </CardContent>
        </Card>

        {/* Processing Timeline */}
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-info" />
              Processing Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessingTimelineChart />
          </CardContent>
        </Card>
      </div>

      {/* Summary Reports */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TopCustomersCard />
        <TopVendorsCard />
        <RecentActivityCard />
      </div>
    </div>
  );
};

// Chart Components
function RevenueChart() {
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
          .slice(-6); // Last 6 months

        setData(chartData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="h-80 flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-80">
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

function StatusPieChart() {
  const [data, setData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('status');
        
        if (error) throw error;

        const statusCounts: Record<string, number> = {};
        (invoices || []).forEach((invoice: any) => {
          statusCounts[invoice.status] = (statusCounts[invoice.status] || 0) + 1;
        });

        const colors = {
          paid: 'hsl(var(--success))',
          pending: 'hsl(var(--warning))',
          overdue: 'hsl(var(--destructive))',
          validated: 'hsl(var(--info))',
          processed: 'hsl(var(--corporate-blue))'
        };

        const chartData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count,
          color: colors[status as keyof typeof colors] || 'hsl(var(--muted))'
        }));

        setData(chartData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="h-80 flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={(entry) => `${entry.name}: ${entry.value}`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

function GSTBarChart() {
  const [data, setData] = useState<Array<{ month: string; gst: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('gst_amount, created_at')
          .not('gst_amount', 'is', null);
        
        if (error) throw error;

        const monthlyGST: Record<string, number> = {};
        (invoices || []).forEach((invoice: any) => {
          const month = new Date(invoice.created_at).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short' 
          });
          monthlyGST[month] = (monthlyGST[month] || 0) + Number(invoice.gst_amount || 0);
        });

        const chartData = Object.entries(monthlyGST)
          .map(([month, gst]) => ({ month, gst }))
          .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
          .slice(-6);

        setData(chartData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="h-80 flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip formatter={(value) => [`$${value}`, 'GST Collected']} />
          <Bar dataKey="gst" fill="hsl(var(--warning))" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProcessingTimelineChart() {
  const [data, setData] = useState<Array<{ date: string; processed: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: invoices, error } = await supabase
          .from('invoices')
          .select('created_at');
        
        if (error) throw error;

        const dailyCounts: Record<string, number> = {};
        (invoices || []).forEach((invoice: any) => {
          const date = new Date(invoice.created_at).toLocaleDateString();
          dailyCounts[date] = (dailyCounts[date] || 0) + 1;
        });

        const chartData = Object.entries(dailyCounts)
          .map(([date, processed]) => ({ date, processed }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(-14); // Last 14 days

        setData(chartData);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) return <div className="h-80 flex items-center justify-center">Loading...</div>;

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip formatter={(value) => [`${value}`, 'Invoices Processed']} />
          <Line type="monotone" dataKey="processed" stroke="hsl(var(--info))" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Analytics;

function currency(amount: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(amount);
}

function TopCustomersCard() {
  const [rows, setRows] = useState<Array<{ name: string; total: number; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("total_amount, customers:customer_id(company_name)")
          .eq("status", "paid");
        if (error) throw error;
        const aggregates: Record<string, { total: number; count: number }> = {};
        (data || []).forEach((row: any) => {
          const name = row.customers?.company_name || "Unknown";
          if (!aggregates[name]) aggregates[name] = { total: 0, count: 0 };
          aggregates[name].total += Number(row.total_amount || 0);
          aggregates[name].count += 1;
        });
        const top = Object.entries(aggregates)
          .map(([name, v]) => ({ name, total: v.total, count: v.count }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setRows(top);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Top Customers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">No data</div>}
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-foreground">{row.name}</p>
              <p className="text-sm text-muted-foreground">{row.count} invoice(s)</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{currency(row.total)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TopVendorsCard() {
  const [rows, setRows] = useState<Array<{ name: string; total: number; count: number }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("total_amount, vendors:vendor_id(company_name)")
          .eq("status", "paid");
        if (error) throw error;
        const aggregates: Record<string, { total: number; count: number }> = {};
        (data || []).forEach((row: any) => {
          const name = row.vendors?.company_name || "Unknown";
          if (!aggregates[name]) aggregates[name] = { total: 0, count: 0 };
          aggregates[name].total += Number(row.total_amount || 0);
          aggregates[name].count += 1;
        });
        const top = Object.entries(aggregates)
          .map(([name, v]) => ({ name, total: v.total, count: v.count }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 5);
        setRows(top);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Top Vendors</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">No data</div>}
        {rows.map((row, index) => (
          <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
            <div>
              <p className="font-medium text-foreground">{row.name}</p>
              <p className="text-sm text-muted-foreground">{row.count} invoice(s)</p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">{currency(row.total)}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function RecentActivityCard() {
  const [rows, setRows] = useState<Array<{ action: string; time: string; type: "success" | "info" }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("invoices")
          .select("invoice_number,status,updated_at")
          .order("updated_at", { ascending: false })
          .limit(6);
        if (error) throw error;
        const mapped = (data || []).map((row) => {
          const type: "success" | "info" = row.status === "paid" ? "success" : "info";
          const action = row.status === "paid"
            ? `Invoice ${row.invoice_number} paid`
            : row.status === "validated"
              ? `Invoice ${row.invoice_number} validated`
              : row.status === "processed"
                ? `Invoice ${row.invoice_number} processed`
                : `Invoice ${row.invoice_number} created`;
          const time = new Date(row.updated_at as unknown as string).toLocaleString();
          return { action, time, type };
        });
        setRows(mapped);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
        {!loading && rows.length === 0 && <div className="text-sm text-muted-foreground">No activity</div>}
        {rows.map((activity, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
            <div className={`w-2 h-2 rounded-full mt-2 ${activity.type === "success" ? "bg-success" : "bg-info"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{activity.action}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}