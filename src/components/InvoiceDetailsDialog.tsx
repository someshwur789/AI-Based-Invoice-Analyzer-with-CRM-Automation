import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  total_amount: number;
  status: string;
  vendor?: {
    company_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  customer?: {
    company_name: string;
    email?: string;
    phone?: string;
    address?: string;
  };
}

interface InvoiceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

export function InvoiceDetailsDialog({ open, onOpenChange, invoice }: InvoiceDetailsDialogProps) {
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return <Badge className="bg-success text-success-foreground">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-warning text-warning-foreground">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-destructive text-destructive-foreground">Overdue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Header */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Invoice #{invoice.invoice_number}</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Date: {format(new Date(invoice.invoice_date), 'MMM dd, yyyy')}
                  </p>
                  {invoice.due_date && (
                    <p className="text-muted-foreground">
                      Due: {format(new Date(invoice.due_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {getStatusBadge(invoice.status)}
                  <p className="text-2xl font-bold text-corporate-blue mt-2">
                    ${invoice.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Vendor & Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vendor Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Vendor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.vendor ? (
                  <>
                    <div>
                      <p className="font-medium">{invoice.vendor.company_name}</p>
                    </div>
                    {invoice.vendor.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{invoice.vendor.email}</p>
                      </div>
                    )}
                    {invoice.vendor.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{invoice.vendor.phone}</p>
                      </div>
                    )}
                    {invoice.vendor.address && (
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{invoice.vendor.address}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No vendor information available</p>
                )}
              </CardContent>
            </Card>

            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {invoice.customer ? (
                  <>
                    <div>
                      <p className="font-medium">{invoice.customer.company_name}</p>
                    </div>
                    {invoice.customer.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{invoice.customer.email}</p>
                      </div>
                    )}
                    {invoice.customer.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="font-medium">{invoice.customer.phone}</p>
                      </div>
                    )}
                    {invoice.customer.address && (
                      <div>
                        <p className="text-sm text-muted-foreground">Address</p>
                        <p className="font-medium">{invoice.customer.address}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground">No customer information available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Invoice Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Invoice ID:</span>
                  <span className="font-mono text-sm">{invoice.id}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span>Status:</span>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="flex justify-between">
                  <span>Issue Date:</span>
                  <span>{format(new Date(invoice.invoice_date), 'MMMM dd, yyyy')}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between">
                    <span>Due Date:</span>
                    <span>{format(new Date(invoice.due_date), 'MMMM dd, yyyy')}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span className="text-corporate-blue">${invoice.total_amount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}