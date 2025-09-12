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
import { useResponsaveisEmpresa, ResponsavelEmpresaInsert } from '@/hooks/useResponsaveisEmpresa';
import { ResponsavelEmpresa } from '@/hooks/useEmpresas';

const responsavelSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  cargo: z.string().optional(),
  tipo_responsabilidade: z.enum(['financeiro', 'juridico', 'geral', 'outros']),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  observacoes: z.string().optional(),
});

type ResponsavelFormData = z.infer<typeof responsavelSchema>;

interface ResponsavelFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresaId: string;
  responsavel?: ResponsavelEmpresa;
}

export const ResponsavelFormModal = ({ isOpen, onClose, empresaId, responsavel }: ResponsavelFormModalProps) => {
  const { createResponsavel, updateResponsavel, isCreating, isUpdating } = useResponsaveisEmpresa(empresaId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResponsavelFormData>({
    resolver: zodResolver(responsavelSchema),
    defaultValues: {
      nome: '',
      cargo: '',
      tipo_responsabilidade: 'geral',
      telefone: '',
      email: '',
      observacoes: '',
    },
  });

  useEffect(() => {
    if (responsavel) {
      form.reset({
        nome: responsavel.nome,
        cargo: responsavel.cargo || '',
        tipo_responsabilidade: responsavel.tipo_responsabilidade,
        telefone: responsavel.telefone || '',
        email: responsavel.email || '',
        observacoes: responsavel.observacoes || '',
      });
    } else {
      form.reset({
        nome: '',
        cargo: '',
        tipo_responsabilidade: 'geral',
        telefone: '',
        email: '',
        observacoes: '',
      });
    }
  }, [responsavel, form]);

  const onSubmit = async (data: ResponsavelFormData) => {
    try {
      setIsSubmitting(true);
      
      if (responsavel) {
        await updateResponsavel.mutateAsync({
          id: responsavel.id,
          ...data,
        });
      } else {
        const insertData: ResponsavelEmpresaInsert = {
          empresa_id: empresaId,
          nome: data.nome,
          tipo_responsabilidade: data.tipo_responsabilidade,
          cargo: data.cargo || undefined,
          telefone: data.telefone || undefined,
          email: data.email || undefined,
          observacoes: data.observacoes || undefined,
        };
        await createResponsavel.mutateAsync(insertData);
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar responsável:', error);
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
            {responsavel ? 'Editar Responsável' : 'Novo Responsável'}
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
              name="tipo_responsabilidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Responsabilidade *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="financeiro">Financeiro</SelectItem>
                      <SelectItem value="juridico">Jurídico</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
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
                {responsavel ? 'Atualizar' : 'Adicionar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};