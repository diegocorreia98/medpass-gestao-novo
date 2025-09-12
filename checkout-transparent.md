title Checkout transparente - Assinatura recorrente (Cartão ou Boleto/Pix/Bolepix)

actor CLIENTE
participant FRONTEND
participant BACKEND
participant VINDI

== Acesso ==
CLIENTE -> FRONTEND : Acessa a plataforma e escolhe plano/itens
deactivate CLIENTE

== Escolha do método de pagamento ==
alt Método = Cartão de crédito

  == Tokenização no Front ==
  FRONTEND -> VINDI : POST /v1/public/payment_profiles\n(dados do cartão com chave pública)
  activate VINDI
  note over BACKEND,VINDI
  Tokenização deve usar a chave pública da Vindi.
  gateway_token tem TTL ~5min e é de uso único.
  Não armazene dados sensíveis nem o token.
  end note
  VINDI --> FRONTEND : gateway_token
  deactivate VINDI

  == Envio ao Backend ==
  FRONTEND -> BACKEND : Envia gateway_token\n+ dados da compra/cliente

  == Cliente na Vindi ==
  BACKEND -> VINDI : GET /v1/customers (consulta) \nOU POST /v1/customers (cria)
  activate VINDI
  VINDI -> VINDI : Consulta/cadastra cliente
  VINDI --> BACKEND : customer_id
  deactivate VINDI

  opt (opcional) Vincular cartão antes
    BACKEND -> VINDI : POST /v1/payment_profiles\n(customer_id + gateway_token)
    activate VINDI
    VINDI -> VINDI : Cria payment_profile
    VINDI --> BACKEND : payment_profile_id
    deactivate VINDI
  end

  opt (opcional) Split/Afiliados
    note over BACKEND,VINDI
    Retorna afiliado apenas se a conta estiver
    criada e verificada na Vindi Pagamentos.
    end note
    BACKEND -> VINDI : GET /v1/affiliates (consulta)\nOU POST /v1/affiliates (cria/ativa)
    VINDI --> BACKEND : affiliate_id(s)
  end

  == Criar assinatura ==
  BACKEND -> VINDI : POST /v1/subscriptions\n(customer_id, plano/itens, periodicidade,\nsplit opcional, metadata,\npayment_profile_id OU gateway_token)
  activate VINDI
  VINDI -> VINDI : Cria assinatura
  VINDI --> BACKEND : Retorno da assinatura
  VINDI --> BACKEND : Webhook "Assinatura efetuada"
  deactivate VINDI

else Método = Boleto / Pix / Bolepix

  == Envio ao Backend ==
  FRONTEND -> BACKEND : Envia dados da compra/cliente\n(não há tokenização)

  == Cliente na Vindi ==
  BACKEND -> VINDI : GET /v1/customers (consulta)\nOU POST /v1/customers (cria)
  activate VINDI
  VINDI -> VINDI : Cadastra cliente
  VINDI --> BACKEND : customer_id
  deactivate VINDI

  opt (opcional) Split/Afiliados
    note over BACKEND,VINDI
    Retorna afiliado apenas se a conta estiver
    criada e verificada na Vindi Pagamentos.
    end note
    BACKEND -> VINDI : GET /v1/affiliates (consulta)\nOU POST /v1/affiliates (cria/ativa)
    VINDI --> BACKEND : affiliate_id(s)
  end

  == Criar assinatura ==
  BACKEND -> VINDI : POST /v1/subscriptions\n(customer_id, plano/itens, periodicidade,\nmethod=boleto|pix|bolepix, split opcional, metadata)
  activate VINDI
  VINDI -> VINDI : Cria assinatura
  VINDI --> BACKEND : Retorno da assinatura
  VINDI --> BACKEND : Webhook "Assinatura efetuada"
  deactivate VINDI

end

== Ciclos recorrentes ==
loop A cada ciclo da assinatura
  activate VINDI
  VINDI -> VINDI : Gera fatura do ciclo
  VINDI --> BACKEND : Webhook "Fatura emitida"\n(invoice_id, valor, vencimento, status inicial)

  group Exibir instruções de pagamento (quando boleto/pix/bolepix)
    BACKEND -> BACKEND : Processa espelho do boleto\nou QR Code / copia-e-cola do Pix
    BACKEND --> FRONTEND : Envia parâmetros de exibição
    FRONTEND -> FRONTEND : Renderiza boleto/QR/payload Pix
  end

  group Notificação opcional ao cliente
    VINDI --> CLIENTE : Notifica fatura emitida (opcional)
  end

  alt Pagamento aprovado
    VINDI --> BACKEND : Atualiza status paid
    VINDI --> BACKEND : Webhook "Fatura paga"
    group Notificação opcional
      VINDI --> CLIENTE : Notifica pagamento confirmado (opcional)
    end
  else Pagamento rejeitado/pendente
    VINDI --> BACKEND : Status pending + motivo em charges[]
    VINDI --> BACKEND : Webhook "Cobrança rejeitada"
    group Notificação opcional
      VINDI --> CLIENTE : Informa rejeição/como regularizar (opcional)
    end
    opt (configurável) Dunning/Retentativas
      VINDI -> VINDI : Novas tentativas automáticas
    end
  end
  deactivate VINDI
end

== Observações de segurança ==
note over FRONTEND,BACKEND
Frontend usa somente chave pública.
Nunca trafegar PAN/CVV no Backend.
gateway_token é volátil (TTL ~5min) e de uso único.
Guardar apenas IDs: customer_id, subscription_id,
payment_profile_id, invoice_id, affiliate_id(s) e status.
Webhooks devem ser verificados e processados de forma idempotente.
end note