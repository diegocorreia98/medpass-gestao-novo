
# Integração por API – Adesão V4.3

## Regras para Homologação – Ambiente de Desenvolvimento
- Realizar adesão, pagamento e cancelamento (se houver no contrato).  
- Adesão: envio de no mínimo **50 vidas**.  
- Cancelamentos: **10 registros** (aguardar 15 min após envio da adesão).  
- Pagamentos: **10 registros** (quando aplicável).  
- Dúvidas devem ser tratadas com o responsável pelo contrato junto ao time da Rede Mais Saúde.  

---

## Token de Acesso
- Autenticação via **token de acesso** (um por ambiente).  
- Token é fornecido pela equipe de tecnologia.  

**Ambientes**:  
- Homologação: `https://ddt8urmaeb.execute-api.us-east-1.amazonaws.com/hml-v1/rms1`  
- Produção: enviado após homologação.  

⚠️ **Importante**: formatos diferentes do layout são rejeitados.  

---

## Regras Específicas
### Capitalização
- Válido apenas para produtos de capitalização.  
- Se administrada pela RMS: números retornam no endpoint.  
- Se administrada pelo parceiro: envio obrigatório dos campos `capNumeroSerie` e `capNumeroSorte`.  

### Elegibilidade do Beneficiário
- Endpoint: `/adesao`  
- Método: `POST`  
- Content-Type: `application/json`  
- Header: `{ "x-api-key": "string" }`  

---

## Parâmetros de Envio (Body)
### Campos principais
- **idClienteContrato** *(integer)* – Código contrato/plano (fixo da RMS) – **obrigatório**  
- **idBeneficiarioTipo** *(integer)* – [1 - Titular / 3 - Dependente / 5 - Responsável Financeiro] – **obrigatório**  
- **nome** *(string[100])* – Nome completo – **obrigatório**  
- **codigoExterno** *(string[50])* – Código do beneficiário no sistema do cliente – **obrigatório**  
- **cpfTitular** *(string[11])* – CPF do titular (obrigatório se dependente)  
- **cpf** *(string[11])* – CPF do beneficiário – **obrigatório**  
- **dataNascimento** *(date ddMMyyyy)* – **obrigatório**  
- **celular** *(string[11])* – **obrigatório**  
- **email** *(string[100])* – **obrigatório**  
- **cep**, **numero**, **uf**, **tipoPlano** – **obrigatórios**  
- Outros campos: opcionais (nome social, RG, estado civil, mãe, telefone fixo/comercial, complemento, bairro, cidade etc.).  

---

## Exemplo JSON

### Titular
```json
{
 "idClienteContrato": 999999999,
 "idBeneficiarioTipo": 1,
 "nome": "NOME DO BENEFICIARIO TITULAR",
 "codigoExterno": "999999999",
 "cpf": "39966687084",
 "idCliente": 999999,
 "celular": "99999999999",
 "email": "TESTE@TESTE.COM",
 "cep": "04578000",
 "numero": "10989",
 "uf": "SP",
 "tipoPlano": "9999"
}
```

### Dependente
```json
{
 "idClienteContrato": 999999999,
 "idBeneficiarioTipo": 3,
 "nome": "NOME DO BENEFICIARIO DEPENDENTE",
 "codigoExterno": "999999999",
 "cpfTitular": "39966687084",
 "cpf": "89560451006",
 "idCliente": 999999,
 "celular": "99999999999",
 "email": "TESTE@TESTE.COM",
 "cep": "04578000",
 "numero": "10989",
 "uf": "SP",
 "tipoPlano": "9999"
}
```

---

## Responses Padrão

### Sucesso
```json
{
  "mensagem": "Beneficiário cadastrado com sucesso"
}
```

### Erros
- **400** – com `codigoErro` e `mensagem`  
- **401** – `"Acesso negado - Credencial Inválida"`  
- **404** – `"O servidor não pode encontrar o recurso solicitado"`  

### Com Capitalização
```json
{
  "mensagem": "Beneficiário cadastrado com sucesso",
  "capNumeroSerie": "99999",
  "capNumeroSorte": "999999999"
}
```

---

## Rejeições (Status 400)
- `1000` – Campo obrigatório.  
- `1001` – Tipo do valor diferente.  
- `1002` – Tamanho inválido.  
- `1003` – Cliente inativo ou inexistente.  
- `1004` – Tipo de plano inativo ou inexistente.  
- `1005` – Contrato inativo ou inexistente.  
- `1006` – idBeneficiarioTipo inválido.  
- `1007` – CPF titular obrigatório para dependente.  
- `1008` – Sexo inválido.  
- `1009` – Estado civil inválido.  
- `1010` – CPF inválido.  
- `1011` – CPF do titular inválido.  
- `1012` – Campo não pode ser vazio.  
- `1013` – E-mail inválido.  
- `1014` – UF inválido.  
- `1015` – Data de nascimento inválida.  
- `1016` – Beneficiário já existe no sistema.  
- `1017` – Capitalização: campos obrigatórios não enviados.  
