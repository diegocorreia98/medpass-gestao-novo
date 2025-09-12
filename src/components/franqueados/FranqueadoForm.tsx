import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import type { Franqueado } from "@/pages/Franqueados"

const formSchema = z.object({
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

type FormData = z.infer<typeof formSchema>

interface FranqueadoFormProps {
  franqueado?: Franqueado | null
  onSubmit: (data: Omit<Franqueado, 'id' | 'createdAt'>) => void
  existingCufs: string[]
}

export function FranqueadoForm({ franqueado, onSubmit, existingCufs }: FranqueadoFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema.refine((data) => {
      // Check if CUF already exists (only for new franqueados or different CUFs)
      if (existingCufs.includes(data.cuf)) {
        return false
      }
      return true
    }, {
      message: "Este CUF já está em uso",
      path: ["cuf"]
    })),
    defaultValues: {
      nome: franqueado?.nome || "",
      email: franqueado?.email || "",
      telefone: franqueado?.telefone || "",
      cuf: franqueado?.cuf || "",
      banco: franqueado?.dadosBancarios?.banco || "",
      agencia: franqueado?.dadosBancarios?.agencia || "",
      conta: franqueado?.dadosBancarios?.conta || "",
      tipoConta: franqueado?.dadosBancarios?.tipoConta || "",
      chavePix: franqueado?.chavePix || ""
    }
  })

  const handleSubmit = (data: FormData) => {
    const franqueadoData = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cuf: data.cuf.toUpperCase(),
      dadosBancarios: {
        banco: data.banco,
        agencia: data.agencia,
        conta: data.conta,
        tipoConta: data.tipoConta
      },
      chavePix: data.chavePix,
      cnpj: null,
      endereco: null,
      cidade: null,
      estado: null,
      responsavel: null,
      status: 'ativo' as const
    }
    onSubmit(franqueadoData)
  }

  const formatCuf = (value: string) => {
    // Remove tudo que não é letra ou número
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '')
    
    // Se começar com UND, remove para reprocessar
    const withoutPrefix = cleaned.replace(/^UND/i, '')
    
    // Pega apenas os números
    const numbers = withoutPrefix.replace(/[^0-9]/g, '').slice(0, 5)
    
    // Retorna no formato UND-XXXXX
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
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Dados Pessoais */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground">Dados Pessoais</h3>
          
          <FormField
            control={form.control}
            name="nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Completo</FormLabel>
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
                  <FormLabel>Email</FormLabel>
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
            name="cuf"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CUF (Código Único do Franqueado)</FormLabel>
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
          <h3 className="text-lg font-medium text-foreground">Dados Bancários</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="banco"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Banco</FormLabel>
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
                  <FormLabel>Tipo de Conta</FormLabel>
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
                  <FormLabel>Agência</FormLabel>
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
                  <FormLabel>Conta</FormLabel>
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
                <FormLabel>Chave PIX</FormLabel>
                <FormControl>
                  <Input placeholder="Email, telefone, CPF ou chave aleatória" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="submit">
            {franqueado ? "Atualizar Franqueado" : "Adicionar Franqueado"}
          </Button>
        </div>
      </form>
    </Form>
  )
}