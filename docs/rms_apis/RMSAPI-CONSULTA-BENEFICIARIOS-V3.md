
# RMS API – Consulta de Beneficiários V3

## Tecnologia & Inovação
**Integração por API – Consulta Beneficiários V2.0**

---

## Obtenção do Token de Acesso
As API’s utilizam autenticação por **token de acesso**.  
Para cada ambiente é disponibilizado um token, que será encaminhado pelo responsável da equipe de tecnologia.

### Ambientes de Acesso
**RMS SYS API – TOKEN/AMBIENTE**  
- Homologação: `https://ddt8urmaeb.execute-api.us-east-1.amazonaws.com/hml-v1/rms1`  
- Produção: Será enviado após homologação ser realizada.

---

## Considerações
- CPF é **opcional**.  
- Caso não retorne linhas, validar os parâmetros enviados (ex: `idCliente`, `idClienteContrato`).  
- Retorna as vidas por contrato, ou seja, caso existam mais de um contrato com a RMS, o retorno é por contrato.  
- Em caso de dúvidas, solicitar o envolvimento do time da RMS.

---

## Consulta de Beneficiários
**RMS SYS API – CONSULTA BENEFICIÁRIOS**  
- **EndPoint**: `/beneficiarios`  
- **Layout**: Consulta de Vidas na base - RMSApi  
- **Método**: `GET`  
- **Content-Type**: `application/json`  

### Header
```json
{
  "x-api-key": "string"
}
```

---

## Campos de Envio (Body)
**RMS SYS API – PARÂMETROS DE ENVIO**

| Campo            | Tipo        | Descrição                                            | Condição     |
|------------------|------------|------------------------------------------------------|--------------|
| idCliente        | INTEGER    | ID do Cliente [valor fixo disponibilizado pela RMS]  | Obrigatório  |
| idClienteContrato| INTEGER    | ID do Cliente Contrato [valor fixo disponibilizado]  | Obrigatório  |
| cpf              | STRING[11] | CPF do Beneficiário                                  | Opcional     |
| dataInicial      | STRING[10] | Data inicial de adesão                               | Obrigatório  |
| dataFinal        | STRING[10] | Data final de adesão                                 | Obrigatório  |
| offset           | INTEGER    | Valor a partir do qual a busca irá iniciar           | Opcional     |

---

## Response Padrão
```json
{
  "offset": 0,
  "limit": 100,
  "count": 1,
  "beneficiarios": [
    {
      "idClienteContrato": 999999,
      "idCliente": 99999,
      "idBeneficiarioTipo": 1,
      "beneficiario": "SOUZA",
      "nomeSocial": "",
      "codigoExterno": "9999",
      "status": "CANCELADO",
      "tipoPlano": "99999",
      "plano": "PLANO",
      "dataAdesao": "13/04/2023",
      "dataCancelamento": "13/04/2023",
      "email": "SEMEMAIL@TESTE.COM.BR",
      "cpf": "99999999999",
      "cpfTitular": null,
      "celular": "00000000000",
      "dataNascimento": "03/03/1996",
      "sexo": "M",
      "estadoCivil": "N",
      "cep": "00000000",
      "logradouro": null,
      "complemento": null,
      "numero": "S N",
      "bairro": null,
      "cidade": null,
      "uf": "RJ"
    }
  ]
}
```

---

## Response Padrão – Rejeições
**StatusCode 400 – Rejeições**

| Código | Mensagem |
|--------|----------|
| 1000   | `<Campo>` - Campo obrigatório |
| 1003   | `<idCliente>` - Cliente inativo ou não existe em nossa base |
| 1005   | `<idClienteContrato>` - Contrato inativo ou não existe em nossa base |
| 1010   | `<cpf>` - Inválido |
| 1034   | `<Data>` - Inválida |

---

📌 **Observação**: Este documento contém informações confidenciais e de uso restrito ao destinatário autorizado.
