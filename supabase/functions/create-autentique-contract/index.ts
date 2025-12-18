import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateContractRequest {
  beneficiario_id: string;
  customer_data: {
    nome: string;
    cpf: string;
    email: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    data_nascimento?: string;
  };
  plano_data: {
    nome: string;
    valor: number;
  };
}

// Função para formatar CPF
function formatCPF(cpf: string): string {
  const cleaned = cpf.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// Função para formatar valor monetário
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para converter número para extenso
function numberToWords(num: number): string {
  const units = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  const teens = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  const tens = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  const hundreds = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  if (num === 0) return 'zero';
  if (num === 100) return 'cem';

  let words = '';

  if (num >= 100) {
    words += hundreds[Math.floor(num / 100)];
    num %= 100;
    if (num > 0) words += ' e ';
  }

  if (num >= 20) {
    words += tens[Math.floor(num / 10)];
    num %= 10;
    if (num > 0) words += ' e ';
  } else if (num >= 10) {
    words += teens[num - 10];
    return words;
  }

  if (num > 0) {
    words += units[num];
  }

  return words;
}

// Função para converter valor monetário para extenso
function currencyToWords(value: number): string {
  const reais = Math.floor(value);
  const centavos = Math.round((value - reais) * 100);
  
  let result = '';
  
  if (reais === 1) {
    result = 'um real';
  } else if (reais > 1) {
    result = numberToWords(reais) + ' reais';
  }
  
  if (centavos > 0) {
    if (result) result += ' e ';
    if (centavos === 1) {
      result += 'um centavo';
    } else {
      result += numberToWords(centavos) + ' centavos';
    }
  }
  
  return result || 'zero reais';
}

// Função para gerar HTML do contrato preenchido - MODELO OFICIAL MEDPASS PF
function generateContractHTML(customerData: any, planoData: any): string {
  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const enderecoCompleto = [
    customerData.endereco,
    customerData.cidade,
    customerData.estado,
    customerData.cep ? `CEP: ${customerData.cep}` : ''
  ].filter(Boolean).join(', ');

  const localAssinatura = customerData.cidade && customerData.estado 
    ? `${customerData.cidade}/${customerData.estado}` 
    : 'Umuarama/PR';

  const prazoFidelizacao = 12;
  const percentualMulta = 50;

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contrato de Fidelização MedPass - ${customerData.nome}</title>
    <style>
        @page {
            margin: 1.5cm;
            size: A4;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-size: 10pt;
        }
        h1 {
            text-align: center;
            color: #1e3a5f;
            font-size: 14pt;
            margin-bottom: 20px;
            text-transform: uppercase;
            border-bottom: 2px solid #1e3a5f;
            padding-bottom: 10px;
        }
        h2 {
            color: #1e3a5f;
            font-size: 11pt;
            margin-top: 20px;
            margin-bottom: 10px;
            text-transform: uppercase;
        }
        h3 {
            color: #2563eb;
            font-size: 10pt;
            margin-top: 15px;
            margin-bottom: 8px;
        }
        p {
            text-align: justify;
            margin: 8px 0;
        }
        .header-section {
            margin-bottom: 20px;
        }
        .parties {
            background: #f8fafc;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 3px solid #1e3a5f;
        }
        .highlight {
            font-weight: bold;
            color: #1e3a5f;
        }
        .clause {
            margin: 15px 0;
        }
        .clause-title {
            font-weight: bold;
            color: #1e3a5f;
            margin-bottom: 8px;
        }
        .signature-area {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 1px solid #ccc;
        }
        .signature-box {
            display: inline-block;
            width: 45%;
            text-align: center;
            margin: 20px 2%;
            vertical-align: top;
        }
        .signature-line {
            border-top: 1px solid #000;
            padding-top: 8px;
            margin-top: 50px;
        }
        .annexes {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #1e3a5f;
        }
        .annexes h1 {
            font-size: 12pt;
        }
        .service-section {
            background: #f1f5f9;
            padding: 12px;
            margin: 10px 0;
            border-radius: 5px;
        }
        .service-section h3 {
            margin-top: 0;
        }
        ul {
            margin: 8px 0;
            padding-left: 20px;
        }
        li {
            margin: 4px 0;
        }
        .footer-note {
            margin-top: 30px;
            padding: 10px;
            background: #fff3cd;
            border-radius: 5px;
            font-size: 9pt;
            text-align: center;
        }
    </style>
</head>
<body>
    <h1>CONTRATO DE FIDELIZAÇÃO DE PLANOS DE ASSISTÊNCIA À SAÚDE MEDPASS</h1>

    <div class="header-section">
        <p>Pelo presente instrumento particular, de um lado:</p>
        
        <div class="parties">
            <p><strong>MEDPASS – MULTI BENEFÍCIOS - LTDA</strong>, empresa inscrita no CNPJ sob o nº 54.638.988/0001-48, com sede na Av. Presidente Castelo Branco, 4451, Andar 2 Sala 3 na cidade de Umuarama – Paraná, neste ato representada por seu sócio ISMAEL DE OLIVEIRA DIAS, brasileiro, casado sob regime de separação de bens, natural de Curitiba/PR, em 17/02/1989, empresário, inscrito no CPF sob nº 010.206.919-05, doravante denominada <strong>CONTRATADA</strong>;</p>
        </div>

        <p>E, de outro lado:</p>

        <div class="parties">
            <p><strong class="highlight">${customerData.nome}</strong>, CPF: <strong class="highlight">${formatCPF(customerData.cpf)}</strong>, Endereço: <strong class="highlight">${enderecoCompleto || 'Não informado'}</strong>, doravante denominado <strong>CONTRATANTE</strong>;</p>
        </div>

        <p>Têm entre si, justas e contratadas, as seguintes cláusulas e condições:</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 1 – DO OBJETO</h2>
        <p>O presente contrato tem por objeto a adesão do CONTRATANTE ao plano de assistência à saúde Medpass, conforme a modalidade escolhida no ato da adesão (<strong>${planoData.nome}</strong>), com os benefícios e coberturas descritos em regulamento próprio disponibilizado pela CONTRATADA. Anexo abaixo.</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 2 – DA FIDELIZAÇÃO</h2>
        <p>O CONTRATANTE compromete-se a permanecer vinculado ao plano de assistência pelo prazo mínimo de <strong>${prazoFidelizacao}</strong> (<strong>${numberToWords(prazoFidelizacao)}</strong>) meses, contados a partir da data de assinatura deste contrato e sendo renovado automaticamente sem aviso prévio.</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 3 – DO PAGAMENTO</h2>
        <p>3.1. O CONTRATANTE pagará à CONTRATADA o valor mensal de <strong>${formatCurrency(planoData.valor)}</strong> (<strong>${currencyToWords(planoData.valor)}</strong>), referente ao plano contratado.</p>
        <p>3.2. O pagamento será realizado por meio de boleto bancário, débito automático ou outro meio aceito pela CONTRATADA.</p>
        <p>3.3. O atraso no pagamento superior a 30 (trinta) dias poderá acarretar a suspensão temporária dos serviços até a regularização das parcelas em atraso.</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 4 – DA MULTA POR RESCISÃO ANTECIPADA</h2>
        <p>4.1. Caso o CONTRATANTE rescinda o contrato antes do término do prazo de fidelização, ficará sujeito ao pagamento de multa rescisória correspondente a <strong>${percentualMulta}%</strong> (<strong>${numberToWords(percentualMulta)} por cento</strong>) do valor das mensalidades vincendas até o final do período contratado.</p>
        <p>4.2. Não será aplicada multa caso a rescisão decorra de descumprimento contratual por parte da CONTRATADA.</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 5 – DA RENOVAÇÃO</h2>
        <p>Findo o prazo de fidelização, o contrato será renovado automaticamente por prazo indeterminado, podendo ser rescindido por qualquer das partes mediante aviso prévio de 30 (trinta) dias, sem multa.</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 6 – DAS RESPONSABILIDADES</h2>
        <p>6.1. A CONTRATADA se responsabiliza por disponibilizar os benefícios descritos no regulamento do plano, observadas as condições de utilização.</p>
        <p>6.2. O CONTRATANTE compromete-se a cumprir as regras de utilização do plano, bem como manter os pagamentos em dia.</p>
    </div>

    <div class="clause">
        <h2>CLÁUSULA 7 – DAS DISPOSIÇÕES GERAIS</h2>
        <p>7.1. Este contrato não substitui plano de saúde ou seguro saúde, tratando-se de serviço de assistência e benefícios em saúde.</p>
        <p>7.2. As partes elegem o foro da comarca de <strong>Umuarama/PR</strong>, renunciando a qualquer outro, para dirimir eventuais controvérsias oriundas deste contrato.</p>
    </div>

    <div class="signature-area">
        <p>E, por estarem de pleno acordo, as partes assinam o presente contrato em duas vias de igual teor e forma.</p>
        
        <p style="text-align: right; margin: 20px 0;"><strong>Local:</strong> ${localAssinatura} &nbsp;&nbsp;&nbsp; <strong>Data:</strong> ${dataAtual}</p>

        <div style="text-align: center;">
            <div class="signature-box">
                <div class="signature-line">
                    <p style="margin: 0;"><strong>CONTRATANTE</strong></p>
                    <p style="margin: 5px 0; font-size: 9pt;">${customerData.nome}</p>
                    <p style="margin: 0; font-size: 9pt;">CPF: ${formatCPF(customerData.cpf)}</p>
                </div>
            </div>
            <div class="signature-box">
                <div class="signature-line">
                    <p style="margin: 0;"><strong>CONTRATADA</strong></p>
                    <p style="margin: 5px 0; font-size: 9pt;">ISMAEL DE OLIVEIRA DIAS</p>
                    <p style="margin: 0; font-size: 9pt;">MEDPASS – MULTI BENEFÍCIOS LTDA</p>
                </div>
            </div>
        </div>
    </div>

    <!-- ANEXO: DESCRIÇÃO DOS SERVIÇOS -->
    <div class="annexes">
        <h1>DESCRIÇÃO DOS SERVIÇOS OFERECIDOS</h1>
        
        <p>O Grupo Cotafácil unificou diversas empresas, como Healthtechs, Odontotechs, Fintechs, Bentechs e várias outras, complementando serviços e benefícios alinhados com o core business em saúde com total sinergia entre serviços de saúde, assistências, odontologia, benefícios e bem-estar, transformando-se no maior ecossistema de saúde do Brasil.</p>
        
        <p>A Medpass, uma empresa do Grupo Cotafacil é uma Healthtech inovadora que oferece uma jornada completa de saúde, conectando empresas e clientes a um ecossistema digital completo. Por meio do aplicativo Medpass, garantimos o acesso facilitado integrado ao usuário: serviços médicos, exames, medicamentos e terapias com condições especiais.</p>

        <div class="service-section">
            <h3>PRODUTOS</h3>
            <p>Dentre as principais soluções disponíveis, destacam-se:</p>
            <ul>
                <li>Consultas médicas online 24h</li>
                <li>Consultas presenciais com descontos em rede nacional</li>
                <li>Exames laboratoriais e de imagem com condições especiais</li>
                <li>Descontos em Medicamentos</li>
                <li>Check-Up</li>
                <li>E muito mais</li>
            </ul>
        </div>

        <div class="service-section">
            <h3>AGENDAMENTO DE SAÚDE</h3>
            <p>Entendendo as necessidades de cada usuário, disponibilizamos uma equipe multidisciplinar capacitada para fornecer indicações de clínicas e serviços em determinada região, horário ou faixa de preço. Além disso, possibilitamos o acesso a descontos de até 80% no valor particular e oferecemos orientações sobre os serviços de saúde públicos e privados.</p>
            <ul>
                <li><strong>Acionamento:</strong> Central de atendimento, WhatsApp, Portal Web ou Aplicativo</li>
                <li><strong>Horário:</strong> Atendimento 24x7x365</li>
                <li><strong>Dependentes:</strong> Até 3 dependentes sem comprovação de vínculo familiar</li>
                <li><strong>Vigência:</strong> Até 48 horas úteis após adesão</li>
                <li><strong>Abrangência:</strong> Nacional</li>
            </ul>
            <p>Serviços que podem ser agendados: Consultas (Clínico geral, Cardiologista, Pediatra, Neurologista, Ginecologia, Ortopedista, entre outros), Exames Laboratoriais e de Imagem, Serviços de Bem-Estar e Estética, Vacinas.</p>
        </div>

        <div class="service-section">
            <h3>ORIENTAÇÃO DE SAÚDE ONLINE</h3>
            <p>Atendimento realizado por equipe especializada de profissionais de enfermagem para orientar o paciente na adoção de melhores práticas para o cuidado com a saúde.</p>
            <ul>
                <li><strong>Atendimento:</strong> Disponível 24 horas, 7 dias na semana</li>
                <li><strong>Dependentes:</strong> Até 3 dependentes</li>
                <li><strong>Limite:</strong> 15 acionamentos mensais por usuário</li>
            </ul>
        </div>

        <div class="service-section">
            <h3>CONSULTA ONLINE + CLÍNICO GERAL + ESPECIALISTAS</h3>
            <p>Atendimento com profissionais de enfermagem para triagem e direcionamento a médico generalista ou especialista quando necessário.</p>
            <ul>
                <li><strong>Clínico Geral:</strong> Disponível 24h, 7 dias na semana</li>
                <li><strong>Especialidades:</strong> Segunda a sexta, 09h às 18h (Cardiologia, Dermatologia, Endocrinologia, Gastroenterologia, Geriatria, Ginecologia, Neurologia, Ortopedia, Otorrinolaringologia, Pediatria, Psiquiatria, Urologia)</li>
                <li><strong>Dependentes:</strong> Até 3 dependentes</li>
                <li><strong>Limite:</strong> 5 acionamentos mensais por usuário</li>
            </ul>
        </div>

        <div class="service-section">
            <h3>APOIO EMOCIONAL</h3>
            <p>Serviço de apoio emocional com psicólogos qualificados para acolhimento em saúde mental.</p>
            <ul>
                <li><strong>Horário:</strong> 8h às 18h, segunda a sexta-feira</li>
                <li><strong>Duração:</strong> Até 30 minutos por atendimento</li>
                <li><strong>Limite:</strong> 5 acionamentos mensais por usuário</li>
                <li><strong>Disponível:</strong> Até 2 dias úteis após adesão</li>
            </ul>
        </div>

        <div class="service-section">
            <h3>APOIO NUTRI ONLINE</h3>
            <p>Orientação de nutricionistas qualificados para esclarecimentos sobre educação alimentar, IMC, hábitos alimentares e estilo de vida saudável.</p>
            <ul>
                <li><strong>Horário:</strong> Segunda a sexta, 9h às 18h</li>
                <li><strong>Duração:</strong> Até 30 minutos</li>
                <li><strong>Limite:</strong> 5 acionamentos mensais por usuário</li>
            </ul>
        </div>

        <div class="service-section">
            <h3>ASSISTÊNCIA FITNESS</h3>
            <p>Orientação personalizada sobre atividades físicas, condicionamento e qualidade de vida.</p>
            <ul>
                <li><strong>Horário:</strong> 8h às 18h, segunda a sexta-feira</li>
                <li><strong>Retorno:</strong> Em até 72 horas</li>
                <li><strong>Limite:</strong> 5 acionamentos mensais por usuário</li>
            </ul>
        </div>

        <div class="service-section">
            <h3>CHECK-UP ANUAL ROTINA</h3>
            <p>Serviço de Medicina Preventiva com conjunto de exames periódicos para avaliar o estado de saúde geral, possibilitando intervenções precoces e diagnósticos preventivos.</p>
        </div>
    </div>

    <div class="footer-note">
        <p>Documento assinado digitalmente via Autentique.com.br<br>
        A autenticidade deste documento pode ser verificada através do ID do documento.</p>
    </div>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📄 [CREATE-AUTENTIQUE-CONTRACT] Iniciando criação de contrato');

    // Verificar chave da API
    const AUTENTIQUE_API_KEY = Deno.env.get('AUTENTIQUE_API_KEY');
    if (!AUTENTIQUE_API_KEY) {
      throw new Error('AUTENTIQUE_API_KEY não configurada nas variáveis de ambiente');
    }

    // Inicializar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Parse do body
    const { beneficiario_id, customer_data: frontendCustomerData, plano_data: frontendPlanoData } = await req.json() as CreateContractRequest;

    console.log('📋 [CREATE-AUTENTIQUE-CONTRACT] Dados recebidos:', {
      beneficiario_id,
      frontend_customer_name: frontendCustomerData?.nome,
      frontend_plano_nome: frontendPlanoData?.nome
    });

    // Validações básicas
    if (!beneficiario_id) {
      throw new Error('beneficiario_id é obrigatório');
    }

    // ✅ Buscar dados COMPLETOS do beneficiário do banco de dados
    // (evita usar dados mascarados do frontend)
    console.log('🔍 [CREATE-AUTENTIQUE-CONTRACT] Buscando dados completos do beneficiário...');
    
    const { data: beneficiarioData, error: beneficiarioError } = await supabaseClient
      .from('beneficiarios')
      .select(`
        id,
        nome,
        cpf,
        email,
        telefone,
        endereco,
        cidade,
        estado,
        cep,
        data_nascimento,
        plano_id,
        planos (
          id,
          nome,
          valor
        )
      `)
      .eq('id', beneficiario_id)
      .single();

    if (beneficiarioError || !beneficiarioData) {
      console.error('❌ [CREATE-AUTENTIQUE-CONTRACT] Erro ao buscar beneficiário:', beneficiarioError);
      throw new Error(`Beneficiário não encontrado: ${beneficiarioError?.message || 'ID inválido'}`);
    }

    console.log('✅ [CREATE-AUTENTIQUE-CONTRACT] Beneficiário encontrado:', {
      id: beneficiarioData.id,
      nome: beneficiarioData.nome,
      email: beneficiarioData.email,
      plano: beneficiarioData.planos?.nome
    });

    // Usar dados do banco de dados
    const customer_data = {
      nome: beneficiarioData.nome,
      cpf: beneficiarioData.cpf,
      email: beneficiarioData.email,
      telefone: beneficiarioData.telefone,
      endereco: beneficiarioData.endereco,
      cidade: beneficiarioData.cidade,
      estado: beneficiarioData.estado,
      cep: beneficiarioData.cep,
      data_nascimento: beneficiarioData.data_nascimento
    };

    const plano_data = {
      nome: beneficiarioData.planos?.nome || frontendPlanoData?.nome || 'Plano MedPass',
      valor: beneficiarioData.planos?.valor || frontendPlanoData?.valor || 0
    };

    // Validações dos dados do banco
    if (!customer_data.nome || !customer_data.cpf || !customer_data.email) {
      throw new Error('Dados incompletos do beneficiário: nome, CPF e email são obrigatórios');
    }

    if (!plano_data.nome || !plano_data.valor) {
      throw new Error('Dados do plano não encontrados para este beneficiário');
    }

    // 1. Gerar HTML do contrato preenchido
    console.log('📝 [CREATE-AUTENTIQUE-CONTRACT] Gerando HTML do contrato...');
    const contratoHTML = generateContractHTML(customer_data, plano_data);
    console.log('📝 [CREATE-AUTENTIQUE-CONTRACT] HTML gerado, tamanho:', contratoHTML.length, 'caracteres');

    // Converter HTML para base64 de forma segura (UTF-8)
    let base64HTML: string;
    try {
      const encoder = new TextEncoder();
      const htmlBytes = encoder.encode(contratoHTML);
      
      // Converter bytes para base64 de forma segura
      let binary = '';
      const len = htmlBytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(htmlBytes[i]);
      }
      base64HTML = btoa(binary);
      console.log('📝 [CREATE-AUTENTIQUE-CONTRACT] Base64 gerado, tamanho:', base64HTML.length, 'caracteres');
    } catch (encodeError) {
      console.error('❌ [CREATE-AUTENTIQUE-CONTRACT] Erro ao converter HTML para Base64:', encodeError);
      throw new Error(`Erro ao codificar contrato: ${encodeError instanceof Error ? encodeError.message : 'erro desconhecido'}`);
    }

    // 2. Criar documento no Autentique via GraphQL Multipart Upload
    console.log('🌐 [CREATE-AUTENTIQUE-CONTRACT] Enviando para Autentique API...');

    // Mutation correta para Autentique API v2
    const mutation = `
      mutation CreateDocumentMutation(
        $document: DocumentInput!,
        $signers: [SignerInput!]!,
        $file: Upload!
      ) {
        createDocument(
          document: $document,
          signers: $signers,
          file: $file
        ) {
          id
          name
          refusable
          sortable
          created_at
          signatures {
            public_id
            name
            email
            created_at
            action {
              name
            }
            link {
              short_link
            }
            user {
              id
              name
              email
            }
          }
        }
      }
    `;

    // Preparar variáveis no formato correto da API v2
    const variables = {
      document: {
        name: `Contrato Adesão MedPass - ${customer_data.nome}`
      },
      signers: [
        {
          email: customer_data.email,
          action: "SIGN",
          positions: [
            {
              x: "50.00",
              y: "88.00",
              z: 1
            }
          ]
        }
      ],
      file: null  // Será substituído pelo arquivo no multipart
    };
    
    console.log('📤 [CREATE-AUTENTIQUE-CONTRACT] Enviando documento via multipart:', {
      document_name: variables.document.name,
      signer_email: customer_data.email,
      html_size: contratoHTML.length
    });

    // Criar FormData para upload multipart (GraphQL Upload Specification)
    const formData = new FormData();
    
    // Operations (query + variables com file: null)
    const operations = JSON.stringify({
      query: mutation,
      variables: variables
    });
    formData.append('operations', operations);
    
    // Map (indica onde o arquivo deve ser colocado)
    const map = JSON.stringify({
      "0": ["variables.file"]
    });
    formData.append('map', map);
    
    // O arquivo HTML como Blob
    const htmlBlob = new Blob([contratoHTML], { type: 'text/html' });
    const nomeArquivo = customer_data.nome.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    formData.append('0', htmlBlob, `contrato_medpass_${nomeArquivo}.html`);

    const autentiqueResponse = await fetch('https://api.autentique.com.br/v2/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AUTENTIQUE_API_KEY}`,
        // Não definir Content-Type - o FormData define automaticamente com boundary
      },
      body: formData
    });

    if (!autentiqueResponse.ok) {
      const errorText = await autentiqueResponse.text();
      console.error('❌ [CREATE-AUTENTIQUE-CONTRACT] Erro HTTP:', autentiqueResponse.status, errorText);
      throw new Error(`Erro na API do Autentique: ${autentiqueResponse.status} - ${errorText}`);
    }

    const autentiqueResult = await autentiqueResponse.json();

    console.log('📥 [CREATE-AUTENTIQUE-CONTRACT] Resposta do Autentique:', JSON.stringify(autentiqueResult, null, 2));

    if (autentiqueResult.errors) {
      console.error('❌ [CREATE-AUTENTIQUE-CONTRACT] Erros do Autentique:', autentiqueResult.errors);
      throw new Error(`Erro Autentique: ${JSON.stringify(autentiqueResult.errors)}`);
    }

    if (!autentiqueResult.data || !autentiqueResult.data.createDocument) {
      throw new Error('Resposta inválida do Autentique - documento não criado');
    }

    const document = autentiqueResult.data.createDocument;
    const signatureLink = document.signatures[0]?.link?.short_link;

    if (!signatureLink) {
      throw new Error('Link de assinatura não retornado pelo Autentique');
    }

    console.log('✅ [CREATE-AUTENTIQUE-CONTRACT] Documento criado:', {
      document_id: document.id,
      signature_link: signatureLink
    });

    // 3. Salvar no banco de dados
    console.log('💾 [CREATE-AUTENTIQUE-CONTRACT] Salvando no banco de dados...');

    const { error: updateError } = await supabaseClient
      .from('beneficiarios')
      .update({
        autentique_document_id: document.id,
        autentique_signature_link: signatureLink,
        contract_status: 'pending_signature',
        autentique_data: autentiqueResult.data
      })
      .eq('id', beneficiario_id);

    if (updateError) {
      console.error('⚠️ [CREATE-AUTENTIQUE-CONTRACT] Erro ao atualizar beneficiário:', updateError);
      // Não falhar a requisição se o update falhar, mas logar o erro
    } else {
      console.log('✅ [CREATE-AUTENTIQUE-CONTRACT] Beneficiário atualizado com sucesso');
    }

    // Retornar sucesso
    return new Response(JSON.stringify({
      success: true,
      document_id: document.id,
      signature_link: signatureLink,
      beneficiario_id: beneficiario_id,
      message: 'Contrato criado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ [CREATE-AUTENTIQUE-CONTRACT] Erro geral:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno do servidor',
      details: error instanceof Error ? error.stack : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});

