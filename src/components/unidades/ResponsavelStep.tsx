import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useEffect } from "react"

const responsavelSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cuf: z.string()
    .regex(/^UND-\d{5}$/, "CUF deve seguir o formato UND-12345")
    .refine((value) => value.length === 9, "CUF deve ter exatamente 9 caracteres"),
  banco: z.string().min(1, "Banco é obrigatório"),
  agencia: z.string().min(1, "Agência é obrigatória"),
  conta: z.string().min(1, "Conta é obrigatória"),
  tipoConta: z.string().min(1, "Tipo de conta é obrigatório"),
  chavePix: z.string().min(1, "Chave PIX é obrigatória")
})

export type ResponsavelFormData = z.infer<typeof responsavelSchema>

interface ResponsavelStepProps {
  data: ResponsavelFormData
  onChange: (data: ResponsavelFormData) => void
  onValidationChange: (isValid: boolean) => void
  existingCufs: string[]
}

export function ResponsavelStep({ data, onChange, onValidationChange, existingCufs }: ResponsavelStepProps) {
  const form = useForm<ResponsavelFormData>({
    resolver: zodResolver(responsavelSchema.refine((data) => {
      // Check if CUF already exists
      if (existingCufs.includes(data.cuf)) {
        return false
      }
      return true
    }, {
      message: "Este CUF já está em uso",
      path: ["cuf"]
    })),
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

  const formatCuf = (value: string) => {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '')
    const withoutPrefix = cleaned.replace(/^UND/i, '')
    const numbers = withoutPrefix.replace(/[^0-9]/g, '').slice(0, 5)
    return numbers ? `UND-${numbers}` : 'UND-'
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
        {/* Dados Pessoais */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-foreground">Dados do Responsável</h4>
          
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo *</FormLabel>
                <FormControl>
                  <Input placeholder="Digite o nome completo" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="email@exemplo.com" {...field} />
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
                  <FormLabel>Telefone *</FormLabel>
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
            name="cuf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CUF (Código Único do Franqueado) *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="UND-12345" 
                    {...field}
                    onChange={(e) => field.onChange(formatCuf(e.target.value))}
                    maxLength={9}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Dados Bancários */}
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-foreground">Dados Bancários para Comissões</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="banco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do banco" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipoConta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Conta *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Conta Corrente">Conta Corrente</SelectItem>
                      <SelectItem value="Conta Poupança">Conta Poupança</SelectItem>
                      <SelectItem value="Conta Salário">Conta Salário</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="agencia"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agência *</FormLabel>
                  <FormControl>
                    <Input placeholder="1234-5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conta *</FormLabel>
                  <FormControl>
                    <Input placeholder="12345-6" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="chavePix"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Chave PIX *</FormLabel>
                <FormControl>
                  <Input placeholder="Email, telefone, CPF ou chave aleatória" {...field} />
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