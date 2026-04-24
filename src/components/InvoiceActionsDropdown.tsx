import { useState } from "react";
import { MoreHorizontal, Eye, CreditCard, Mail, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { InvoiceDetailsDialog } from "./InvoiceDetailsDialog";
import { SetPaymentDialog } from "./SetPaymentDialog";
import { SendReminderDialog } from "./SendReminderDialog";
import { DeleteInvoiceDialog } from "./DeleteInvoiceDialog";

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

interface InvoiceActionsDropdownProps {
  invoice: Invoice;
  onUpdate?: (invoice: Invoice) => void;
  onDelete?: (invoiceId: string) => void;
}

export function InvoiceActionsDropdown({ 
  invoice, 
  onUpdate, 
  onDelete 
}: InvoiceActionsDropdownProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showReminder, setShowReminder] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleViewDetails = () => {
    setShowDetails(true);
  };

  const handleSetPayment = () => {
    setShowPayment(true);
  };

  const handleSendReminder = () => {
    setShowReminder(true);
  };

  const handleDelete = () => {
    setShowDelete(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSetPayment}>
            <CreditCard className="mr-2 h-4 w-4" />
            Set Payment
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleSendReminder}>
            <Mail className="mr-2 h-4 w-4" />
            Send Reminder
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <InvoiceDetailsDialog
        open={showDetails}
        onOpenChange={setShowDetails}
        invoice={invoice}
      />

      <SetPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        invoice={invoice}
        onUpdate={onUpdate}
      />

      <SendReminderDialog
        open={showReminder}
        onOpenChange={setShowReminder}
        invoice={invoice}
      />

      <DeleteInvoiceDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        invoice={invoice}
        onConfirm={(invoiceId) => {
          onDelete?.(invoiceId);
          setShowDelete(false);
        }}
      />
    </>
  );
}