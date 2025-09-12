import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useFranquias } from "@/hooks/useFranquias"
import { useEffect } from "react"

const unidadeSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  cnpj: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  telefone: z.string().optional(),
  franquia_id: z.string().optional(),
  observacoes: z.string().optional()
})

export type UnidadeFormData = z.infer<typeof unidadeSchema>

interface UnidadeStepProps {
  data: UnidadeFormData
  onChange: (data: UnidadeFormData) => void
  onValidationChange: (isValid: boolean) => void
}

export function UnidadeStep({ data, onChange, onValidationChange }: UnidadeStepProps) {
  const { franquias } = useFranquias()
  
  const form = useForm<UnidadeFormData>({
    resolver: zodResolver(unidadeSchema),
    defaultValues: data,
    mode: "onChange"
  })

  const { watch, formState: { isValid } } = form
  const watchedData = watch()

  useEffect(() => {
    onChange(watchedData)
  }, [watchedData, onChange])

  useEffect(() => {
    onValidationChange(isValid)
  }, [isValid, onValidationChange])

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, (_, p1, p2, p3, p4, p5) => {
      if (p5) return `${p1}.${p2}.${p3}/${p4}-${p5}`
      if (p4) return `${p1}.${p2}.${p3}/${p4}`
      if (p3) return `${p1}.${p2}.${p3}`
      if (p2) return `${p1}.${p2}`
      return p1
    })
  }

  const formatPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{2})(\d{0,5})(\d{0,4})/, (_, p1, p2, p3) => {
        if (p3) return `(${p1}) ${p2}-${p3}`
        if (p2) return `(${p1}) ${p2}`
        if (p1) return `(${p1}`
        return ''
      })
    }
    return value
  }

  return (
    <Form {...form}>
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-foreground">Informações Básicas</h4>
          
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Unidade *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Ex: Unidade Centro São Paulo" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="00.000.000/0000-00"
                      {...field}
                      onChange={(e) => field.onChange(formatCNPJ(e.target.value))}
                      maxLength={18}
                    />
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
                    <Input 
                      placeholder="(11) 99999-9999"
                      {...field}
                      onChange={(e) => field.onChange(formatPhone(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="franquia_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Franquia</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === "none" ? null : value)} 
                  defaultValue={field.value || "none"}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma franquia (opcional)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma franquia</SelectItem>
                    {franquias?.map((franquia) => (
                      <SelectItem key={franquia.id} value={franquia.id}>
                        {franquia.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h4 className="text-lg font-medium text-foreground">Endereço</h4>
          
          <FormField
            control={form.control}
            name="endereco"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço Completo</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Rua, número, complemento" 
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cidade</FormLabel>
                  <FormControl>
                    <Input placeholder="São Paulo" {...field} />
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
                    <Input placeholder="SP" {...field} maxLength={2} />
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
                  <Textarea 
                    placeholder="Informações adicionais sobre a unidade..."
                    className="min-h-20"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  )
}