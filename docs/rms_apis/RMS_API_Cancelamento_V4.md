
# Integração por API – Cancelamento V4.0

## Token de Acesso
- Autenticação via **token de acesso** (um por ambiente).  
- Token é fornecido pela equipe de tecnologia.  

**Ambientes**:  
- Homologação: `https://ddt8urmaeb.execute-api.us-east-1.amazonaws.com/hml-v1/rms1`  
- Produção: enviado após homologação.  

⚠️ **Importante**: formatos diferentes do layout são rejeitados.  

---

## Considerações
- Para efetuar um cancelamento, o registro precisa ter sido enviado na **API de Adesão** e deve-se aguardar **mínimo de 15 minutos** para processamento.  
- Caso o contrato não tenha regra de cancelamento parametrizada, o sistema não permite reenviar uma vida já cancelada.  

---

## Cancelamento de Beneficiários
- Endpoint: `/cancelamento`  
- Método: `POST`  
- Content-Type: `application/json`  
- Header: `{ "x-api-key": "string" }`  

---

## Exemplo JSON

### Titular
```json
{
 "idClienteContrato": 999999999,
 "idCliente": 999999,
 "cpf": "39966687084",
 "codigoExterno": ""
}
```

### Dependente
```json
{
 "idClienteContrato": 999999999,
 "idCliente": 999999,
 "cpf": "89560451006",
 "codigoExterno": ""
}
```

---

## Responses Padrão

### Sucesso
```json
{
  "mensagem": "Beneficiário cancelado com sucesso"
}
```

### Erros
- **400** – com `codigoErro` e `mensagem`  
- **401** – `"Acesso negado - Credencial Inválida"`  
- **404** – `"O servidor não pode encontrar o recurso solicitado"`  

---

## Rejeições (Status 400)
- `1000` – Campo obrigatório.  
- `1001` – Tipo do valor diferente.  
- `1002` – Tamanho inválido.  
- `1003` – Cliente inativo ou inexistente.  
- `1005` – Contrato inativo ou inexistente.  
- `1010` – CPF inválido.  
- `1018` – Beneficiário já cancelado no sistema.  
