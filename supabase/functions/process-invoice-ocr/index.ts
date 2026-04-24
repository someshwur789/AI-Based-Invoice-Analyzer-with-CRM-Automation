import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OCRData {
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = `${Date.now()}-${file.name}`;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file uploaded' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing file:', fileName);

    // Upload file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to upload file' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('File uploaded successfully:', uploadData.path);

    // Extract OCR using real service if configured; fallback to minimal parsed fields
    const extractedData: OCRData = await extractOCRData(file);

    console.log('OCR processing completed:', extractedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: extractedData,
        file_path: uploadData.path
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    console.error('Error in process-invoice-ocr function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
};

async function extractOCRData(file: File): Promise<OCRData> {
  const visionApiKey = Deno.env.get('GOOGLE_VISION_API_KEY');
  try {
    if (visionApiKey) {
      const bytes = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
      const res = await fetch('https://vision.googleapis.com/v1/images:annotate?key=' + visionApiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }]
        })
      });
      const json = await res.json();
      const text: string = json?.responses?.[0]?.fullTextAnnotation?.text || '';
      const parsed = parseInvoiceFromText(text);
      return parsed;
    }
  } catch (e) {
    console.error('Vision OCR failed', e);
  }

  // Fallback to empty fields for manual review
  const today = new Date();
  const due = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  return {
    invoice_number: '',
    total_amount: 0,
    invoice_date: today.toISOString().split('T')[0],
    due_date: due.toISOString().split('T')[0],
    vendor_name: '',
    vendor_email: '',
    customer_name: '',
    customer_email: '',
    subtotal: 0,
    gst_percentage: 0,
    gst_amount: 0,
    items: []
  };
}

function parseInvoiceFromText(text: string): OCRData {
  console.log('Parsing OCR text:', text.substring(0, 500) + '...');
  
  const match = (re: RegExp) => (text.match(re)?.[1] || '').trim();
  const matchNum = (re: RegExp) => {
    const matched = text.match(re)?.[1] || '0';
    const cleanNum = matched.toString().replace(/[^0-9.]/g, '');
    return Number(cleanNum) || 0;
  };

  // Enhanced patterns for better invoice detection
  const invoice_patterns = [
    /Invoice\s*(?:No\.|Number|#)?\s*:?\s*([A-Za-z0-9-]+)/i,
    /Bill\s*(?:No\.|Number|#)?\s*:?\s*([A-Za-z0-9-]+)/i,
    /Receipt\s*(?:No\.|Number|#)?\s*:?\s*([A-Za-z0-9-]+)/i,
    /(?:^|\n)(?:INV|REC|BILL)[\s-]*([A-Za-z0-9-]+)/i,
    /(?:^|\n)([0-9]{4,})/m // Capture standalone invoice numbers
  ];

  // Enhanced vendor patterns - improved to capture company names at top of invoice
  const vendor_patterns = [
    /^([A-Z][A-Za-z\s&.,]+ Limited)/m,
    /^([A-Z][A-Za-z\s&.,]+ Inc\.?)/m,
    /^([A-Z][A-Za-z\s&.,]+ Corp\.?)/m,
    /^([A-Z][A-Za-z\s&.,]+ LLC)/m,
    /^([A-Z][A-Za-z\s&.,]+ Ltd\.?)/m,
    /From[:\s]*([^\n\r]+)/i,
    /Vendor[:\s]*([^\n\r]+)/i,
    /Supplier[:\s]*([^\n\r]+)/i,
    /Company[:\s]*([^\n\r]+)/i,
    /([A-Z][A-Za-z\s&.,]+ (?:Limited|Ltd|Inc|Corp|LLC|LLP))/
  ];

  // Enhanced customer patterns
  const customer_patterns = [
    /CLIENT\s+([^\n]+)/i,
    /Bill\s*To[:\s]*([^\n\r]+)/i,
    /Sold\s*To[:\s]*([^\n\r]+)/i,
    /Customer[:\s]*([^\n\r]+)/i,
    /Client[:\s]*([^\n\r]+)/i,
    /(?:^|\n)CLIENT[:\s]*([^\n]+)/im
  ];

  // Enhanced date patterns - handle various formats including "Aug. 14, 2023"
  const date_patterns = [
    /DATE\s+([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /Invoice\s*Date[:\s]*([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /Date[:\s]*([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /Invoice\s*Date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /Date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/,
    /([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/
  ];

  const due_date_patterns = [
    /DUE\s*DATE\s+([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /Due\s*Date[:\s]*([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /Payment\s*Due[:\s]*([A-Za-z]{3,4}\.?\s+[0-9]{1,2},?\s+[0-9]{4})/i,
    /Due\s*Date[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i,
    /Payment\s*Due[:\s]*([0-9]{1,2}[\/\-][0-9]{1,2}[\/\-][0-9]{2,4})/i
  ];

  // Enhanced amount patterns to handle currency symbols and formatting
  const total_patterns = [
    /TOTAL\s+\$([0-9,]+\.?[0-9]*)/i,
    /Total[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Grand\s*Total[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Amount\s*Due[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Final\s*Amount[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Total[:\s]*([$₹€£]?\s*[0-9,]+\.?[0-9]*)/i,
    /(?:Total|TOTAL)\s+([0-9,]+\.?[0-9]*)/i
  ];

  const subtotal_patterns = [
    /Subtotal[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Sub\s*Total[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Net\s*Amount[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Subtotal[:\s]*([$₹€£]?\s*[0-9,]+\.?[0-9]*)/i
  ];

  const gst_patterns = [
    /GST[:\s]*([0-9]{1,2})%/i,
    /Tax[:\s]*([0-9]{1,2})%/i,
    /VAT[:\s]*([0-9]{1,2})%/i
  ];

  const gst_amount_patterns = [
    /GST(?:\s*Amount)?[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /Tax(?:\s*Amount)?[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /VAT(?:\s*Amount)?[:\s]*\$([0-9,]+\.?[0-9]*)/i,
    /GST(?:\s*Amount)?[:\s]*([$₹€£]?\s*[0-9,]+\.?[0-9]*)/i
  ];

  // Try multiple patterns for each field
  const tryPatterns = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const result = match(pattern);
      if (result) return result;
    }
    return '';
  };

  const tryNumPatterns = (patterns: RegExp[]) => {
    for (const pattern of patterns) {
      const result = matchNum(pattern);
      if (result > 0) return result;
    }
    return 0;
  };

  // Email patterns
  const email_patterns = [
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
  ];
  
  // Extract emails
  const emails: string[] = [];
  let emailMatch;
  const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  while ((emailMatch = emailRegex.exec(text)) !== null && emails.length < 5) {
    emails.push(emailMatch[1]);
  }

  const invoice_number = tryPatterns(invoice_patterns);
  const vendor_name = tryPatterns(vendor_patterns);
  const customer_name = tryPatterns(customer_patterns);
  
  // Assign emails based on context - first email likely vendor, second customer
  const vendor_email = emails[0] || '';
  const customer_email = emails[1] || '';
  
  const invoice_date_raw = tryPatterns(date_patterns);
  const due_date_raw = tryPatterns(due_date_patterns);
  
  // Convert dates to proper format
  const formatDate = (dateStr: string) => {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    try {
      // Handle date formats like "Aug. 14, 2023" and "Sept. 16, 2023"
      if (dateStr.match(/[A-Za-z]/)) {
        const monthMap: { [key: string]: string } = {
          'jan': '01', 'january': '01',
          'feb': '02', 'february': '02',
          'mar': '03', 'march': '03',
          'apr': '04', 'april': '04',
          'may': '05',
          'jun': '06', 'june': '06',
          'jul': '07', 'july': '07',
          'aug': '08', 'august': '08',
          'sep': '09', 'sept': '09', 'september': '09',
          'oct': '10', 'october': '10',
          'nov': '11', 'november': '11',
          'dec': '12', 'december': '12'
        };
        
        const match = dateStr.match(/([A-Za-z]+)\.?\s+([0-9]{1,2}),?\s+([0-9]{4})/);
        if (match) {
          const [, monthStr, day, year] = match;
          const month = monthMap[monthStr.toLowerCase().replace('.', '')];
          if (month) {
            return `${year}-${month}-${day.padStart(2, '0')}`;
          }
        }
      }
      
      // Handle numeric date formats
      const cleanDate = dateStr.replace(/[\s\-]/g, '/');
      const parsed = new Date(cleanDate);
      if (isNaN(parsed.getTime())) {
        return new Date().toISOString().split('T')[0];
      }
      return parsed.toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const invoice_date = formatDate(invoice_date_raw);
  const due_date = formatDate(due_date_raw) || new Date(Date.now() + 30*86400000).toISOString().split('T')[0];

  const subtotal = tryNumPatterns(subtotal_patterns);
  const gst_percentage = tryNumPatterns(gst_patterns);
  const gst_amount = tryNumPatterns(gst_amount_patterns);
  const total_amount = tryNumPatterns(total_patterns) || (subtotal + gst_amount);

  // Extract line items with enhanced patterns for table-like data
  const items: Array<{name: string; quantity: number; rate: number; amount: number}> = [];
  
  // Pattern for line items like "5947  3M SJ3419FR Scotchmate Fast HK  $46  6  $276"
  const tablePattern = /([0-9]{3,})\s+([A-Za-z0-9\s&\-\.]+?)\s+\$([0-9,]+(?:\.[0-9]{2})?)\s+([0-9]+)\s+\$([0-9,]+(?:\.[0-9]{2})?)/g;
  let itemMatch;
  
  while ((itemMatch = tablePattern.exec(text)) !== null && items.length < 20) {
    const [, itemCode, description, rate, quantity, amount] = itemMatch;
    items.push({
      name: `${itemCode} ${description.trim()}`,
      quantity: parseInt(quantity) || 1,
      rate: parseFloat(rate.replace(/,/g, '')) || 0,
      amount: parseFloat(amount.replace(/,/g, '')) || 0
    });
  }
  
  // Fallback pattern for simpler line items
  if (items.length === 0) {
    const simplePattern = /([A-Za-z][A-Za-z\s]{5,40})\s+([0-9]+)\s+\$?([0-9.,]+)\s+\$?([0-9.,]+)/g;
    while ((itemMatch = simplePattern.exec(text)) !== null && items.length < 10) {
      const [, name, qty, rate, amount] = itemMatch;
      items.push({
        name: name.trim(),
        quantity: parseInt(qty) || 1,
        rate: parseFloat(rate.replace(/,/g, '')) || 0,
        amount: parseFloat(amount.replace(/,/g, '')) || 0
      });
    }
  }

  const result = {
    invoice_number,
    total_amount,
    invoice_date,
    due_date,
    vendor_name,
    vendor_email,
    customer_name,
    customer_email,
    subtotal,
    gst_percentage,
    gst_amount,
    items
  };

  console.log('Parsed invoice data:', result);
  return result;
}

serve(handler);