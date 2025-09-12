import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type { Franquia, FranquiaInsert } from "@/hooks/useFranquias";

const franquiaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  descricao: z.string().optional(),
  ativo: z.boolean().default(true),
});

type FranquiaFormData = z.infer<typeof franquiaSchema>;

interface FranquiaFormProps {
  franquia?: Franquia;
  onSubmit: (data: FranquiaInsert) => void;
  isLoading?: boolean;
}

export function FranquiaForm({ franquia, onSubmit, isLoading }: FranquiaFormProps) {
  const form = useForm<FranquiaFormData>({
    resolver: zodResolver(franquiaSchema),
    defaultValues: {
      nome: franquia?.nome || "",
      descricao: franquia?.descricao || "",
      ativo: franquia?.ativo ?? true,
    },
  });

  const handleSubmit = (data: FranquiaFormData) => {
    onSubmit({
      nome: data.nome,
      descricao: data.descricao || null,
      ativo: data.ativo,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nome"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Franquia *</FormLabel>
              <FormControl>
                <Input placeholder="Ex: CotaFácil" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="descricao"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Descreva a franquia..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ativo"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Franquia Ativa
                </FormLabel>
                <div className="text-sm text-muted-foreground">
                  Franquias inativas não aparecem para seleção
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-4">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : franquia ? "Atualizar" : "Criar"} Franquia
          </Button>
        </div>
      </form>
    </Form>
  );
}