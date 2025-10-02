import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { BeneficiarioCompleto } from '@/types/database';

/**
 * Exporta uma lista de beneficiários para um arquivo Excel
 */
export function exportBeneficiariosToExcel(beneficiarios: BeneficiarioCompleto[], filename?: string) {
  // Preparar dados para exportação
  const data = beneficiarios.map(beneficiario => ({
    'Nome': beneficiario.nome,
    'CPF': beneficiario.cpf,
    'Email': beneficiario.email,
    'Telefone': beneficiario.telefone || '-',
    'Data Nascimento': beneficiario.data_nascimento
      ? format(new Date(beneficiario.data_nascimento), 'dd/MM/yyyy', { locale: ptBR })
      : '-',
    'Plano': beneficiario.plano?.nome || '-',
    'Valor Plano': Number(beneficiario.valor_plano).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }),
    'Unidade': beneficiario.unidade?.nome || 'Matriz',
    'CEP': beneficiario.cep || '-',
    'Endereço': beneficiario.endereco || '-',
    'Número': beneficiario.numero_endereco || '-',
    'Complemento': beneficiario.complemento || '-',
    'Bairro': beneficiario.bairro || '-',
    'Cidade': beneficiario.cidade || '-',
    'Estado': beneficiario.estado || '-',
    'Data Adesão': format(new Date(beneficiario.data_adesao), 'dd/MM/yyyy', { locale: ptBR }),
    'Status': beneficiario.status.charAt(0).toUpperCase() + beneficiario.status.slice(1),
    'Status Pagamento': getPaymentStatusLabel(beneficiario.payment_status),
    'ID Vindi Subscription': beneficiario.vindi_subscription_id || '-',
    'ID Vindi Customer': beneficiario.vindi_customer_id || '-',
    'Checkout Link': beneficiario.checkout_link || '-',
    'Criado em': format(new Date(beneficiario.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
  }));

  // Criar workbook e worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Adesões');

  // Ajustar largura das colunas
  const columnWidths = [
    { wch: 30 }, // Nome
    { wch: 15 }, // CPF
    { wch: 30 }, // Email
    { wch: 15 }, // Telefone
    { wch: 15 }, // Data Nascimento
    { wch: 20 }, // Plano
    { wch: 12 }, // Valor Plano
    { wch: 20 }, // Unidade
    { wch: 10 }, // CEP
    { wch: 30 }, // Endereço
    { wch: 8 },  // Número
    { wch: 15 }, // Complemento
    { wch: 20 }, // Bairro
    { wch: 20 }, // Cidade
    { wch: 8 },  // Estado
    { wch: 15 }, // Data Adesão
    { wch: 12 }, // Status
    { wch: 18 }, // Status Pagamento
    { wch: 20 }, // ID Vindi Subscription
    { wch: 20 }, // ID Vindi Customer
    { wch: 50 }, // Checkout Link
    { wch: 18 }, // Criado em
  ];
  worksheet['!cols'] = columnWidths;

  // Gerar nome do arquivo
  const defaultFilename = `adesoes_${format(new Date(), 'yyyy-MM-dd_HHmmss')}.xlsx`;
  const finalFilename = filename || defaultFilename;

  // Fazer download do arquivo
  XLSX.writeFile(workbook, finalFilename);
}

/**
 * Retorna o label traduzido do status de pagamento
 */
function getPaymentStatusLabel(status?: string | null): string {
  if (!status) return 'Não Solicitado';

  const labels: Record<string, string> = {
    'not_requested': 'Não Solicitado',
    'pending': 'Pendente',
    'paid': 'Pago',
    'failed': 'Falhou',
    'processing': 'Processando',
    'canceled': 'Cancelado',
  };

  return labels[status] || status;
}
