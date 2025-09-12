import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useColaboradoresEmpresa, ColaboradorEmpresaInsert } from '@/hooks/useColaboradoresEmpresa';
import { ColaboradorEmpresa } from '@/hooks/useEmpresas';

const colaboradorSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cargo: z.string().optional(),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  data_admissao: z.string().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
  observacoes: z.string().optional(),
});

type ColaboradorFormData = z.infer<typeof colaboradorSchema>;

interface ColaboradorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  colaborador?: ColaboradorEmpresa;
}

export const ColaboradorFormModal = ({ isOpen, onClose, empresaId, colaborador }: ColaboradorFormModalProps) => {
  const { createColaborador, updateColaborador, isCreating, isUpdating } = useColaboradoresEmpresa(empresaId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ColaboradorFormData>({
    resolver: zodResolver(colaboradorSchema),
    defaultValues: {
      nome: '',
      cargo: '',
      cpf: '',
      telefone: '',
      email: '',
      data_admissao: '',
      status: 'ativo',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (colaborador) {
      form.reset({
        nome: colaborador.nome,
        cargo: colaborador.cargo || '',
        cpf: colaborador.cpf || '',
        telefone: colaborador.telefone || '',
        email: colaborador.email || '',
        data_admissao: colaborador.data_admissao || '',
        status: colaborador.status,
        observacoes: colaborador.observacoes || '',
      });
    } else {
      form.reset({
        nome: '',
        cargo: '',
        cpf: '',
        telefone: '',
        email: '',
        data_admissao: '',
        status: 'ativo',
        observacoes: '',
      });
    }
  }, [colaborador, form]);

  const onSubmit = async (data: ColaboradorFormData) => {
    try {
      setIsSubmitting(true);
      
      if (colaborador) {
        await updateColaborador.mutateAsync({
          id: colaborador.id,
          ...data,
        });
      } else {
        const insertData: ColaboradorEmpresaInsert = {
          empresa_id: empresaId,
          nome: data.nome,
          cargo: data.cargo || undefined,
          cpf: data.cpf || undefined,
          telefone: data.telefone || undefined,
          email: data.email || undefined,
          data_admissao: data.data_admissao || undefined,
          status: data.status,
          observacoes: data.observacoes || undefined,
        };
        await createColaborador.mutateAsync(insertData);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar colaborador:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {colaborador ? 'Editar Colaborador' : 'Novo Colaborador'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cargo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cargo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="000.000.000-00" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="(11) 99999-9999" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_admissao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data de Admissão</FormLabel>
                  <FormControl>
                    <Input {...field} type="date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="observacoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || isCreating || isUpdating}
              >
                {colaborador ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};