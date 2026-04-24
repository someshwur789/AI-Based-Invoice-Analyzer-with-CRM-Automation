import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  due_date?: string;
  customer?: {
    company_name: string;
    email?: string;
  };
}

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice;
}

export function SendReminderDialog({ open, onOpenChange, invoice }: SendReminderDialogProps) {
  const [message, setMessage] = useState(
    `Dear ${invoice.customer?.company_name || 'Customer'},\n\nThis is a friendly reminder regarding the outstanding payment for Invoice #${invoice.invoice_number}.\n\nInvoice Details:\n- Invoice Number: ${invoice.invoice_number}\n- Amount Due: $${invoice.total_amount.toLocaleString()}\n- Due Date: ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}\n\nPlease process this payment at your earliest convenience. If you have any questions or concerns, please don't hesitate to contact us.\n\nThank you for your business.\n\nBest regards,\nYour Accounts Team`
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSendReminder = async () => {
    setLoading(true);
    try {
      // Simulate sending reminder
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast({
        title: "Reminder Sent",
        description: `Payment reminder for Invoice ${invoice.invoice_number} has been sent successfully.`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Payment Reminder</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">To:</p>
                  <p className="font-medium">
                    {invoice.customer?.company_name || 'Customer'}
                    {invoice.customer?.email && (
                      <span className="text-muted-foreground"> ({invoice.customer.email})</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Invoice:</p>
                  <p className="font-medium">#{invoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount:</p>
                  <p className="font-medium">${invoice.total_amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due Date:</p>
                  <p className="font-medium">
                    {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="message">Reminder Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={12}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendReminder} disabled={loading}>
              {loading ? "Sending..." : "Send Reminder"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}