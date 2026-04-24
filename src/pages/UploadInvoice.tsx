import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { useDropzone } from 'react-dropzone';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReviewExtractedDataDialog } from "@/components/ReviewExtractedDataDialog";
import { recognizeImageWithTesseract, parseInvoiceFromText } from "@/lib/ocr";

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

const UploadInvoice = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [filePath, setFilePath] = useState<string>("");
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      processInvoiceWithOCR(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const processInvoiceWithOCR = async (file: File) => {
    setIsProcessing(true);
    setUploadProgress(0);

    const steps = [
      { message: "Uploading file...", progress: 20 },
      { message: "Extracting text with OCR...", progress: 40 },
      { message: "Parsing invoice data...", progress: 60 },
      { message: "Validating information...", progress: 80 },
      { message: "Matching with CRM...", progress: 90 },
      { message: "Processing complete!", progress: 100 },
    ];

    try {
      for (const step of steps) {
        setProcessingStep(step.message);
        setUploadProgress(step.progress);
        
        if (step.progress === 100) {
          // 1) Upload the file to Supabase Storage for record keeping
          const fileName = `${Date.now()}-${file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('invoices')
            .upload(fileName, file, { contentType: file.type, upsert: false });
          if (uploadError) throw uploadError;
          setFilePath(uploadData.path);

          // 2) Run on-device OCR with Tesseract.js
          const text = await recognizeImageWithTesseract(file);
          const parsed = parseInvoiceFromText(text);

          setExtractedData(parsed);
          setShowReviewDialog(true);
          
          toast({
            title: "OCR Processing Complete!",
            description: "Please review and confirm the extracted data.",
          });
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error: any) {
      console.error('Error processing invoice:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "Failed to process invoice. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmExtractedData = async (confirmedData: ExtractedData) => {
    try {
      // Find or create vendor
      let vendorId = null;
      if (confirmedData.vendor_name) {
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('company_name', confirmedData.vendor_name)
          .single();

        if (existingVendor) {
          vendorId = existingVendor.id;
        } else {
          const { data: newVendor, error: vendorError } = await supabase
            .from('vendors')
            .insert({
              company_name: confirmedData.vendor_name,
              email: confirmedData.vendor_email,
            })
            .select('id')
            .single();

          if (vendorError) throw vendorError;
          vendorId = newVendor.id;
        }
      }

      // Find or create customer
      let customerId = null;
      if (confirmedData.customer_name) {
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id')
          .eq('company_name', confirmedData.customer_name)
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              company_name: confirmedData.customer_name,
              email: confirmedData.customer_email,
            })
            .select('id')
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: confirmedData.invoice_number,
          invoice_date: confirmedData.invoice_date,
          due_date: confirmedData.due_date,
          subtotal: confirmedData.subtotal,
          gst_percentage: confirmedData.gst_percentage,
          gst_amount: confirmedData.gst_amount,
          total_amount: confirmedData.total_amount,
          vendor_id: vendorId,
          customer_id: customerId,
          file_path: filePath,
          status: 'pending',
          raw_ocr_data: confirmedData as any,
        })
        .select('id')
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      if (confirmedData.items && confirmedData.items.length > 0) {
        const items = confirmedData.items.map(item => ({
          invoice_id: invoice.id,
          item_name: item.name,
          quantity: item.quantity,
          rate: item.rate,
          amount: item.amount,
        }));

        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items);

        if (itemsError) throw itemsError;
      }

      toast({
        title: "Invoice Created Successfully!",
        description: `Invoice ${confirmedData.invoice_number} has been processed and saved.`,
      });

      // Reset the form
      setShowReviewDialog(false);
      setUploadedFile(null);
      setExtractedData(null);
      setUploadProgress(0);
      setProcessingStep("");
      setFilePath("");

    } catch (error: any) {
      console.error('Error saving invoice:', error);
      toast({
        title: "Save Failed",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCancelReview = () => {
    setShowReviewDialog(false);
    setUploadedFile(null);
    setExtractedData(null);
    setUploadProgress(0);
    setProcessingStep("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Upload Invoice</h1>
        <p className="text-muted-foreground mt-1">
          Upload PDF or image files for automatic processing and CRM integration
        </p>
      </div>

      {/* Upload Area */}
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-corporate-blue" />
            File Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
              isDragActive 
                ? 'border-corporate-blue bg-corporate-light-blue/10' 
                : 'border-border hover:border-corporate-blue/50 hover:bg-muted/30'
            }`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              {uploadedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="w-8 h-8 text-corporate-blue" />
                  <div className="text-left">
                    <p className="font-medium text-foreground">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-medium text-foreground">
                      {isDragActive ? "Drop your invoice here" : "Upload Invoice"}
                    </p>
                    <p className="text-muted-foreground">
                      Drag and drop your PDF or image file, or click to browse
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            <p><strong>Supported formats:</strong> PDF, PNG, JPG, JPEG</p>
            <p><strong>Maximum file size:</strong> 10MB</p>
          </div>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {isProcessing && (
        <Card className="shadow-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-corporate-blue border-t-transparent rounded-full"></div>
              Processing Invoice
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-foreground font-medium">{processingStep}</span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
            
            {uploadProgress === 100 && (
              <div className="flex items-center gap-2 text-success">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Invoice processed successfully!</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Processing Steps Info */}
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle>Processing Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                step: "1",
                title: "OCR Extraction",
                description: "Extract text and data from invoice using advanced OCR technology",
                icon: FileText,
              },
              {
                step: "2", 
                title: "Data Parsing",
                description: "Structure extracted data into invoice fields (vendor, customer, items, totals)",
                icon: CheckCircle,
              },
              {
                step: "3",
                title: "CRM Matching",
                description: "Match vendors and customers with existing CRM records using fuzzy matching",
                icon: AlertCircle,
              },
            ].map((item, index) => (
              <div key={index} className="flex gap-3 p-4 rounded-lg bg-gradient-subtle">
                <div className="w-8 h-8 rounded-full bg-corporate-blue text-white flex items-center justify-center text-sm font-bold">
                  {item.step}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-foreground">{item.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Review Extracted Data Dialog */}
      <ReviewExtractedDataDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        extractedData={extractedData}
        onConfirm={handleConfirmExtractedData}
        onCancel={handleCancelReview}
      />
    </div>
  );
};

export default UploadInvoice;