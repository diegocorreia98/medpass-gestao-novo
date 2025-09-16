import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Eye,
  Download,
  RefreshCw,
  RotateCcw,
  Settings,
  CheckCircle
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { StatusBadge } from '@/components/transactions/StatusBadge';
import { TransactionFilters, TransactionFilters as FiltersComponent } from '@/components/transactions/TransactionFilters';
import { TransactionModal } from '@/components/transactions/TransactionModal';
import { usePaymentStatus } from '@/hooks/usePaymentStatus';
import { useToast } from '@/hooks/use-toast';
import { format, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

interface Transaction {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_document: string;
  plan_name: string;
  plan_price: number;
  payment_method: string;
  status: string;
  installments?: number;
  vindi_charge_id?: string;
  vindi_response?: any;
  created_at: string;
  updated_at: string;
}

export default function Transacoes() {
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshingTransactionId, setRefreshingTransactionId] = useState<string | null>(null);
  const [markingPaidTransactionId, setMarkingPaidTransactionId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [sortField, setSortField] = useState<keyof Transaction>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    status: 'all',
    paymentMethod: 'all',
    dateFrom: undefined,
    dateTo: undefined,
    minValue: '',
    maxValue: ''
  });

  const { data: transactions, isLoading, refetch } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Transaction[];
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Filtered and sorted transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(transaction => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!transaction.customer_name.toLowerCase().includes(searchLower) &&
            !transaction.customer_email.toLowerCase().includes(searchLower)) {
          return false;
        }
      }

      // Status filter
      if (filters.status !== 'all' && transaction.status !== filters.status) {
        return false;
      }

      // Payment method filter
      if (filters.paymentMethod !== 'all' && transaction.payment_method !== filters.paymentMethod) {
        return false;
      }

      // Date range filter
      const transactionDate = new Date(transaction.created_at);
      if (filters.dateFrom && !isWithinInterval(transactionDate, { 
        start: filters.dateFrom, 
        end: filters.dateTo || new Date() 
      })) {
        return false;
      }

      // Value range filter
      if (filters.minValue && transaction.plan_price < parseFloat(filters.minValue)) {
        return false;
      }
      if (filters.maxValue && transaction.plan_price > parseFloat(filters.maxValue)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [transactions, filters, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Statistics
  const stats = useMemo(() => {
    if (!transactions) return {
      totalTransactions: 0,
      totalValue: 0,
      monthlyTransactions: 0,
      successRate: 0
    };

    const currentMonth = new Date();
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const monthlyTransactions = transactions.filter(t => 
      isWithinInterval(new Date(t.created_at), { start: monthStart, end: monthEnd })
    );

    const successfulTransactions = transactions.filter(t => t.status === 'paid');
    const successRate = transactions.length > 0 ? (successfulTransactions.length / transactions.length) * 100 : 0;

    return {
      totalTransactions: transactions.length,
      totalValue: transactions.reduce((sum, t) => sum + t.plan_price, 0),
      monthlyTransactions: monthlyTransactions.length,
      successRate: Math.round(successRate)
    };
  }, [transactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      credit_card: 'Cartão',
      pix: 'PIX',
      boleto: 'Boleto'
    };
    return methods[method] || method;
  };

  const handleSort = (field: keyof Transaction) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleViewDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setModalOpen(true);
  };

  const handleRefreshPaymentStatus = async (transaction: Transaction) => {
    if (!transaction.vindi_charge_id) {
      toast({
        title: "Erro",
        description: "Transação não possui ID da Vindi para verificação",
        variant: "destructive",
      });
      return;
    }

    setRefreshingTransactionId(transaction.id);
    
    try {
      // Use a refresh-payment-statuses function that already exists
      const { data, error } = await supabase.functions.invoke('refresh-payment-statuses');
      
      if (error) {
        throw error;
      }

      await refetch(); // Refresh the transactions list
      
      toast({
        title: "Status atualizado",
        description: `Status dos pagamentos foi verificado`,
      });
    } catch (error) {
      console.error('Error refreshing payment status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pagamento",
        variant: "destructive",
      });
    } finally {
      setRefreshingTransactionId(null);
    }
  };

  const handleTestVindiConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('test-vindi-connection');

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Conexão Vindi OK",
          description: "API key válida e conexão funcionando",
        });
      } else {
        toast({
          title: "Erro na conexão Vindi",
          description: data.message || "Verifique a configuração da API",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing Vindi connection:', error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível testar a conexão com Vindi",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPaid = async (transaction: Transaction) => {
    if (transaction.status === 'paid') {
      toast({
        title: "Transação já paga",
        description: "Esta transação já está marcada como paga",
        variant: "destructive",
      });
      return;
    }

    setMarkingPaidTransactionId(transaction.id);

    try {
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString()
        })
        .eq('id', transaction.id);

      if (error) {
        throw error;
      }

      await refetch(); // Refresh the transactions list

      toast({
        title: "Status atualizado",
        description: "Transação marcada como paga manualmente",
      });
    } catch (error) {
      console.error('Error marking transaction as paid:', error);
      toast({
        title: "Erro",
        description: "Erro ao marcar transação como paga",
        variant: "destructive",
      });
    } finally {
      setMarkingPaidTransactionId(null);
    }
  };

  const handleExport = () => {
    // TODO: Implement CSV/Excel export
    toast({
      title: "Exportação",
      description: "Funcionalidade de exportação será implementada em breve",
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      paymentMethod: 'all',
      dateFrom: undefined,
      dateTo: undefined,
      minValue: '',
      maxValue: ''
    });
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Transações</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Transações</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Atualizar
          </Button>
          <Button variant="outline" onClick={handleTestVindiConnection} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Testar Vindi API
          </Button>
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Transações</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transações do Mês</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Aprovação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <FiltersComponent 
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={clearFilters}
      />

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Histórico de Transações 
            {filteredTransactions.length !== transactions?.length && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredTransactions.length} de {transactions?.length} transações)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {paginatedTransactions.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('customer_name')}
                    >
                      Cliente {sortField === 'customer_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('plan_name')}
                    >
                      Plano {sortField === 'plan_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('plan_price')}
                    >
                      Valor {sortField === 'plan_price' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('payment_method')}
                    >
                      Método {sortField === 'payment_method' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('status')}
                    >
                      Status {sortField === 'status' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:text-foreground"
                      onClick={() => handleSort('created_at')}
                    >
                      Data {sortField === 'created_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                    </TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.customer_name}</div>
                          <div className="text-sm text-muted-foreground">{transaction.customer_email}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{transaction.plan_name}</TableCell>
                      <TableCell className="font-bold">{formatCurrency(transaction.plan_price)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(transaction.payment_method)}</TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                       <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(transaction)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRefreshPaymentStatus(transaction)}
                            disabled={refreshingTransactionId === transaction.id || !transaction.vindi_charge_id}
                            title={!transaction.vindi_charge_id ? "Transação sem ID Vindi" : "Atualizar status do pagamento"}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          {transaction.status !== 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsPaid(transaction)}
                              disabled={markingPaidTransactionId === transaction.id}
                              title="Marcar como pago manualmente"
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} de {filteredTransactions.length} transações
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="flex items-center px-3 text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma transação encontrada</h3>
              <p className="text-muted-foreground">
                {transactions?.length === 0 
                  ? 'Não há transações cadastradas ainda.' 
                  : 'Tente ajustar os filtros para encontrar transações.'
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <TransactionModal
        transaction={selectedTransaction}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}