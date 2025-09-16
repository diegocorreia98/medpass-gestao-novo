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
import { Empresa, useEmpresas } from '@/hooks/useEmpresas';

const empresaSchema = z.object({
  razao_social: z.string().min(1, 'Razão social é obrigatória'),
  nome_fantasia: z.string().optional(),
  cnpj: z.string().min(14, 'CNPJ deve ter pelo menos 14 caracteres'),
  inscricao_estadual: z.string().optional(),
  inscricao_municipal: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  telefone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  website: z.string().optional(),
  observacoes: z.string().optional(),
  status: z.enum(['ativo', 'inativo']).default('ativo'),
});

type EmpresaFormData = z.infer<typeof empresaSchema>;

interface EmpresaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresa?: Empresa;
  unidadeId?: string;
}

export const EmpresaFormModal = ({ isOpen, onClose, empresa, unidadeId }: EmpresaFormModalProps) => {
  const { createEmpresa, updateEmpresa, isCreating, isUpdating } = useEmpresas();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<EmpresaFormData>({
    resolver: zodResolver(empresaSchema),
    defaultValues: {
      razao_social: '',
      nome_fantasia: '',
      cnpj: '',
      inscricao_estadual: '',
      inscricao_municipal: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      telefone: '',
      email: '',
      website: '',
      observacoes: '',
      status: 'ativo',
    },
  });

  useEffect(() => {
    if (empresa) {
      form.reset({
        razao_social: empresa.razao_social,
        nome_fantasia: empresa.nome_fantasia || '',
        cnpj: empresa.cnpj,
        inscricao_estadual: empresa.inscricao_estadual || '',
        inscricao_municipal: empresa.inscricao_municipal || '',
        endereco: empresa.endereco || '',
        cidade: empresa.cidade || '',
        estado: empresa.estado || '',
        cep: empresa.cep || '',
        telefone: empresa.telefone || '',
        email: empresa.email || '',
        website: empresa.website || '',
        observacoes: empresa.observacoes || '',
        status: empresa.status,
      });
    } else {
      form.reset({
        razao_social: '',
        nome_fantasia: '',
        cnpj: '',
        inscricao_estadual: '',
        inscricao_municipal: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        telefone: '',
        email: '',
        website: '',
        observacoes: '',
        status: 'ativo',
      });
    }
  }, [empresa, form]);

  const onSubmit = async (data: EmpresaFormData) => {
    try {
      setIsSubmitting(true);
      
      if (empresa) {
        await updateEmpresa.mutateAsync({
          id: empresa.id,
          ...data,
        });
      } else {
        // Ensure required fields for create
        const createData = {
          razao_social: data.razao_social,
          cnpj: data.cnpj,
          nome_fantasia: data.nome_fantasia || undefined,
          inscricao_estadual: data.inscricao_estadual || undefined,
          inscricao_municipal: data.inscricao_municipal || undefined,
          endereco: data.endereco || undefined,
          cidade: data.cidade || undefined,
          estado: data.estado || undefined,
          cep: data.cep || undefined,
          telefone: data.telefone || undefined,
          email: data.email || undefined,
          website: data.website || undefined,
          observacoes: data.observacoes || undefined,
          status: data.status,
        };
        await createEmpresa.mutateAsync({
          ...createData,
          unidadeId
        });
      }
      
      onClose();
    } catch (error) {
      console.error('Erro ao salvar empresa:', error);
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {empresa ? 'Editar Empresa' : 'Nova Empresa'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="razao_social"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome_fantasia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Fantasia</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00.000.000/0000-00" />
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
                name="inscricao_estadual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inscricao_municipal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Municipal</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endereco"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Endereço</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cidade</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: SP" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00000-000" />
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://www.exemplo.com.br" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
                {empresa ? 'Atualizar' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};