import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit } from "lucide-react";

interface ExtractedData {
  invoice_number: string;
  total_amount: number;
  invoice_date: string;
  due_date: string;
  vendor_name: string;
  vendor_email: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  gst_percentage: number;
  gst_amount: number;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

interface ReviewExtractedDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: ExtractedData | null;
  onConfirm: (data: ExtractedData) => void;
  onCancel: () => void;
}

export function ReviewExtractedDataDialog({
  open,
  onOpenChange,
  extractedData,
  onConfirm,
  onCancel
}: ReviewExtractedDataDialogProps) {
  const [editedData, setEditedData] = useState<ExtractedData | null>(extractedData);

  // Update local state when extractedData changes
  if (extractedData && (!editedData || editedData.invoice_number !== extractedData.invoice_number)) {
    setEditedData(extractedData);
  }

  if (!editedData) return null;

  const handleFieldChange = (field: keyof ExtractedData, value: any) => {
    setEditedData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleConfirm = () => {
    if (editedData) {
      onConfirm(editedData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Review & Edit Extracted Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Invoice Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice #</Label>
              <Input
                id="invoice_number"
                value={editedData.invoice_number}
                onChange={(e) => handleFieldChange('invoice_number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total_amount">Total Amount</Label>
              <Input
                id="total_amount"
                type="number"
                value={editedData.total_amount}
                onChange={(e) => handleFieldChange('total_amount', parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={editedData.invoice_date}
                onChange={(e) => handleFieldChange('invoice_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={editedData.due_date}
                onChange={(e) => handleFieldChange('due_date', e.target.value)}
              />
            </div>
          </div>

          {/* Vendor Details */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Vendor Name</Label>
                  <Input
                    id="vendor_name"
                    value={editedData.vendor_name}
                    onChange={(e) => handleFieldChange('vendor_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendor_email">Vendor Email</Label>
                  <Input
                    id="vendor_email"
                    type="email"
                    value={editedData.vendor_email}
                    onChange={(e) => handleFieldChange('vendor_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name</Label>
                  <Input
                    id="customer_name"
                    value={editedData.customer_name}
                    onChange={(e) => handleFieldChange('customer_name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Customer Email</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={editedData.customer_email}
                    onChange={(e) => handleFieldChange('customer_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {editedData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-4 gap-3 p-3 border rounded">
                    <div className="space-y-1">
                      <Label className="text-xs">Item Name</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const newItems = [...editedData.items];
                          newItems[index].name = e.target.value;
                          handleFieldChange('items', newItems);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantity</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...editedData.items];
                          newItems[index].quantity = parseInt(e.target.value) || 0;
                          handleFieldChange('items', newItems);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Rate</Label>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const newItems = [...editedData.items];
                          newItems[index].rate = parseFloat(e.target.value) || 0;
                          handleFieldChange('items', newItems);
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Amount</Label>
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const newItems = [...editedData.items];
                          newItems[index].amount = parseFloat(e.target.value) || 0;
                          handleFieldChange('items', newItems);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-corporate-blue hover:bg-corporate-blue/90">
              Confirm & Continue
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}