import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DadosImportacao {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  cep: string;
  numero: string;
  cidade: string;
  estado: string;
  planoId: string;
  empresaId?: string;
  observacoes?: string;
}

interface ResultadoProcessamento {
  linha: number;
  nome: string;
  cpf: string;
  status: 'sucesso' | 'erro' | 'warning';
  mensagem: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { dados } = await req.json() as { dados: DadosImportacao[] };

    if (!dados || !Array.isArray(dados)) {
      throw new Error('Dados inválidos');
    }

    console.log(`Processando ${dados.length} registros...`);

    const resultados: ResultadoProcessamento[] = [];
    let sucessos = 0;
    let erros = 0;
    let warnings = 0;

    // Obter o usuário autenticado
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização obrigatório');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    // Processar cada registro
    for (let i = 0; i < dados.length; i++) {
      const item = dados[i];
      const linha = i + 1;

      try {
        // Validar CPF único
        const { data: cpfExistente } = await supabase
          .from('beneficiarios')
          .select('id')
          .eq('cpf', item.cpf)
          .single();

        if (cpfExistente) {
          resultados.push({
            linha,
            nome: item.nome,
            cpf: item.cpf,
            status: 'warning',
            mensagem: 'CPF já cadastrado no sistema'
          });
          warnings++;
          continue;
        }

        // Verificar se o plano existe
        const { data: plano, error: planoError } = await supabase
          .from('planos')
          .select('*')
          .eq('id', item.planoId)
          .single();

        if (planoError || !plano) {
          resultados.push({
            linha,
            nome: item.nome,
            cpf: item.cpf,
            status: 'erro',
            mensagem: 'Plano não encontrado'
          });
          erros++;
          continue;
        }

        // Verificar se a empresa existe (se fornecida)
        if (item.empresaId) {
          const { data: empresa, error: empresaError } = await supabase
            .from('empresas')
            .select('id')
            .eq('id', item.empresaId)
            .single();

          if (empresaError || !empresa) {
            resultados.push({
              linha,
              nome: item.nome,
              cpf: item.cpf,
              status: 'warning',
              mensagem: 'Empresa não encontrada, cadastro criado sem empresa'
            });
            warnings++;
            // Continua o processamento sem a empresa
            item.empresaId = undefined;
          }
        }

        // Criar beneficiário
        const beneficiarioData = {
          nome: item.nome,
          cpf: item.cpf.replace(/\D/g, ''), // Remove caracteres não numéricos
          email: item.email,
          telefone: item.telefone,
          data_nascimento: item.dataNascimento,
          endereco_cep: item.cep,
          endereco_numero: item.numero,
          endereco_cidade: item.cidade,
          endereco_estado: item.estado,
          plano_id: item.planoId,
          empresa_id: item.empresaId || null,
          user_id: user.id,
          data_adesao: new Date().toISOString(),
          status: 'ativo' as const,
          valor_plano: plano.valor,
          observacoes: item.observacoes
        };

        const { data: beneficiario, error: beneficiarioError } = await supabase
          .from('beneficiarios')
          .insert(beneficiarioData)
          .select()
          .single();

        if (beneficiarioError) {
          throw beneficiarioError;
        }

        // Chamar API externa para notificação
        try {
          await supabase.functions.invoke('notify-external-api', {
            body: {
              operation: 'adesao',
              data: {
                beneficiarioId: beneficiario.id,
                ...beneficiarioData
              }
            }
          });
        } catch (apiError) {
          console.warn(`Erro na API externa para ${item.nome}:`, apiError);
          // Não falhamos a importação por erro na API externa
        }

        resultados.push({
          linha,
          nome: item.nome,
          cpf: item.cpf,
          status: 'sucesso',
          mensagem: 'Adesão criada com sucesso'
        });
        sucessos++;

      } catch (error) {
        console.error(`Erro no registro linha ${linha}:`, error);
        
        resultados.push({
          linha,
          nome: item.nome,
          cpf: item.cpf,
          status: 'erro',
          mensagem: error.message || 'Erro ao processar registro'
        });
        erros++;
      }
    }

    console.log(`Processamento concluído: ${sucessos} sucessos, ${erros} erros, ${warnings} warnings`);

    const relatorio = {
      sucessos,
      erros,
      warnings,
      total: dados.length,
      detalhes: resultados
    };

    return new Response(JSON.stringify(relatorio), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro no processamento em lote:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});