# Sons de Notificação

Esta pasta contém os arquivos de som para as notificações do sistema.

## Arquivo Necessário

Para que o sistema de som funcione, você precisa adicionar o seguinte arquivo:

- `payment-success.mp3` - Som que toca quando um pagamento é confirmado

## Como Obter o Arquivo de Som

1. **Sites Recomendados:**
   - Pixabay: https://pixabay.com/sound-effects/
   - Pikbest: https://pt.pikbest.com/free-sound-effects/dinheiro.html
   - FiftySounds: https://www.fiftysounds.com/pt/efeitos-sonoros.html

2. **Palavras-chave para Buscar:**
   - "cash register" (caixa registradora)
   - "money drop" (moedas caindo)
   - "payment success" (pagamento bem-sucedido)
   - "coin", "cash", "ding", "bell"

3. **Especificações do Arquivo:**
   - Formato: MP3
   - Tamanho: Preferencialmente < 100KB
   - Duração: 1-3 segundos
   - Nome: `payment-success.mp3`

## Instalação

1. Baixe o arquivo de som do site escolhido
2. Renomeie para `payment-success.mp3`
3. Coloque nesta pasta (`public/sounds/`)
4. O som funcionará automaticamente quando um pagamento for confirmado

## Teste

Após adicionar o arquivo, você pode testar o som:
1. Acesse a página "Sistema de Notificações"
2. Na seção "Configurações de Som", clique em "Testar Som de Pagamento"
3. O som deve tocar se estiver configurado corretamente