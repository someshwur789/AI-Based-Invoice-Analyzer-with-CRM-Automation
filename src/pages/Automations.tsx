import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Zap, Play, Calendar, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface OverdueInvoice {
  id: string;
  invoice_number: string;
  customer: {
    company_name: string;
  } | null;
  total_amount: number;
  due_date: string | null;
}

interface AutomationWorkflow {
  id: string;
  name: string;
  description: string;
  status: string;
}

const Automations = () => {
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [workflows, setWorkflows] = useState<AutomationWorkflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [runningAutomation, setRunningAutomation] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOverdueInvoices();
    fetchWorkflows();
  }, []);

  const fetchOverdueInvoices = async () => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          total_amount,
          due_date,
          customer:customers(company_name)
        `)
        .eq('status', 'pending')
        .lt('due_date', currentDate)
        .order('due_date', { ascending: false });

      if (error) throw error;

      setOverdueInvoices(data || []);
    } catch (error: any) {
      console.error('Error fetching overdue invoices:', error);
      toast({
        title: "Error",
        description: "Failed to fetch overdue invoices",
        variant: "destructive",
      });
    }
  };

  const fetchWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('automation_workflows')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      setWorkflows(data || []);
    } catch (error: any) {
      console.error('Error fetching workflows:', error);
    }
  };

  const runFollowUpWorkflow = async () => {
    setRunningAutomation(true);
    try {
      // Update overdue invoices status and create automation tasks
      const overdueIds = overdueInvoices.map(invoice => invoice.id);
      
      if (overdueIds.length > 0) {
        // Update invoice status to overdue
        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: 'overdue' })
          .in('id', overdueIds);

        if (updateError) throw updateError;

        // Create automation tasks for each overdue invoice
        const workflow = workflows.find(w => w.name === 'Overdue Invoice Follow-up');
        if (workflow) {
          const tasks = overdueIds.map(invoiceId => ({
            workflow_id: workflow.id,
            invoice_id: invoiceId,
            task_type: 'follow_up',
            status: 'completed',
            completed_at: new Date().toISOString()
          }));

          const { error: taskError } = await supabase
            .from('automation_tasks')
            .insert(tasks);

          if (taskError) throw taskError;
        }

        toast({
          title: "Workflow Completed",
          description: `Successfully processed ${overdueIds.length} overdue invoice(s) for follow-up.`,
        });

        // Refresh the data
        fetchOverdueInvoices();
      } else {
        toast({
          title: "No Invoices to Process",
          description: "All invoices are up to date.",
        });
      }
    } catch (error: any) {
      console.error('Error running automation:', error);
      toast({
        title: "Automation Failed",
        description: "Failed to run the follow-up workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRunningAutomation(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Automations</h1>
        <p className="text-muted-foreground mt-1">
          Run automated workflows to streamline your CRM processes.
        </p>
      </div>

      {/* Overdue Invoice Follow-up Workflow */}
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-warning/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-warning" />
            </div>
            Overdue Invoice Follow-up Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This automation will find all unpaid invoices that are past their due date and have not been followed up on yet. 
            It will mark them as 'overdue' and create a high-priority task for you to begin the follow-up process.
          </p>

          <Button 
            onClick={runFollowUpWorkflow}
            disabled={runningAutomation}
            className="bg-corporate-blue hover:bg-corporate-blue/90"
          >
            <Play className="w-4 h-4 mr-2" />
            {runningAutomation 
              ? `Processing ${overdueInvoices.length} Invoice(s)...`
              : `Start Follow-up for ${overdueInvoices.length} Invoice(s)`
            }
          </Button>
        </CardContent>
      </Card>

      {/* Invoices Awaiting Follow-up */}
      <Card className="shadow-card border-border">
        <CardHeader>
          <CardTitle>Invoices Awaiting Follow-up</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            This is the list of invoices that will be processed when you run the workflow.
          </p>

          {overdueInvoices.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No new overdue invoices to process.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {invoice.customer?.company_name || 'Unknown Customer'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        {invoice.total_amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : 'No due date'}
                        <Badge variant="destructive" className="text-xs">
                          Overdue
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Workflow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {workflows.filter(w => w.status === 'active').length}
                </p>
                <p className="text-muted-foreground">Active Workflows</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{overdueInvoices.length}</p>
                <p className="text-muted-foreground">Overdue Invoices</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-corporate-light-blue/20 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-corporate-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  ${overdueInvoices.reduce((sum, inv) => sum + inv.total_amount, 0).toLocaleString()}
                </p>
                <p className="text-muted-foreground">Overdue Amount</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Automations;