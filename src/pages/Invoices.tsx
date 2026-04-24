import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Upload, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InvoiceActionsDropdown } from "@/components/InvoiceActionsDropdown";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string | null;
  total_amount: number;
  status: string;
  vendor?: {
    company_name: string;
  };
  customer?: {
    company_name: string;
  };
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          invoice_date,
          due_date,
          total_amount,
          status,
          vendors:vendor_id (company_name),
          customers:customer_id (company_name)
        `)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedData = data?.map((invoice: any) => ({
        ...invoice,
        vendor: invoice.vendors ? { company_name: invoice.vendors.company_name } : undefined,
        customer: invoice.customers ? { company_name: invoice.customers.company_name } : undefined,
      })) || [];

      setInvoices(transformedData);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast({
        title: "Error",
        description: "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceUpdate = (updatedInvoice: Invoice) => {
    setInvoices((prev) => prev.map((inv) => inv.id === updatedInvoice.id ? { ...inv, ...updatedInvoice } : inv));
    toast({ title: "Invoice updated" });
  };

  const handleInvoiceDelete = async (invoiceId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);
      if (error) throw error;

      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
      toast({ title: "Invoice deleted" });
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast({ title: "Delete failed", description: "Could not delete invoice", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending", className: "" },
      processed: { variant: "default" as const, label: "Processed", className: "" },
      validated: { variant: "outline" as const, label: "Validated", className: "" },
      paid: { variant: "default" as const, label: "Paid", className: "bg-success text-success-foreground" },
      overdue: { variant: "destructive" as const, label: "Overdue", className: "" },
      cancelled: { variant: "outline" as const, label: "Cancelled", className: "" },
    } as const;

    const key = (status || 'pending') as keyof typeof statusConfig;
    const config = statusConfig[key] || statusConfig.pending;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.vendor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer?.company_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage all processed invoices
          </p>
        </div>
        <Button asChild className="shadow-corporate">
          <Link to="/upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload Invoice
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card className="shadow-card border-border">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search invoices, vendors, or customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle>
            Invoices ({filteredInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-corporate-blue mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading invoices...</p>
              </div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium text-foreground">No invoices found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" ? "Try adjusting your filters" : "Upload your first invoice to get started"}
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-medium">Invoice #</TableHead>
                    <TableHead className="font-medium">Date</TableHead>
                    <TableHead className="font-medium">Vendor</TableHead>
                    <TableHead className="font-medium">Customer</TableHead>
                    <TableHead className="font-medium">Amount</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((invoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-corporate-blue">
                        {invoice.invoice_number}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.invoice_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {invoice.vendor?.company_name || "N/A"}
                      </TableCell>
                      <TableCell>
                        {invoice.customer?.company_name || "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${invoice.total_amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.status)}
                      </TableCell>
                      <TableCell>
                        <InvoiceActionsDropdown 
                          invoice={{
                            id: invoice.id,
                            invoice_number: invoice.invoice_number,
                            invoice_date: invoice.invoice_date,
                            due_date: invoice.due_date,
                            total_amount: invoice.total_amount,
                            status: invoice.status,
                            vendor: invoice.vendor,
                            customer: invoice.customer
                          }}
                          onUpdate={handleInvoiceUpdate}
                          onDelete={handleInvoiceDelete}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;