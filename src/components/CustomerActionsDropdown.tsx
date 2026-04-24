import { useState } from "react";
import { MoreHorizontal, Edit, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { EditCustomerDialog } from "./EditCustomerDialog";
import { DeleteCustomerDialog } from "./DeleteCustomerDialog";

interface Customer {
  id: string;
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  gst_number?: string;
  created_at: string;
}

interface CustomerActionsDropdownProps {
  customer: Customer;
  onUpdate?: (customer: Customer) => void;
  onDelete?: (customerId: string) => void;
}

export function CustomerActionsDropdown({ 
  customer, 
  onUpdate, 
  onDelete 
}: CustomerActionsDropdownProps) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const handleEdit = () => {
    setShowEdit(true);
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
        <DropdownMenuContent align="end" className="bg-background border-border">
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
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

      <EditCustomerDialog
        open={showEdit}
        onOpenChange={setShowEdit}
        customer={customer}
        onUpdate={onUpdate}
      />

      <DeleteCustomerDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        customer={customer}
        onConfirm={(customerId) => {
          onDelete?.(customerId);
          setShowDelete(false);
        }}
      />
    </>
  );
}