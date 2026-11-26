-- Adiciona rastreamento do ultimo resumo automatico gerado pra conversa.
-- Usado pelo ConversationSummaryService (cron a cada 5min) pra:
--   1. Nao gerar resumo duplicado da mesma janela
--   2. Delimitar a janela da proxima leitura: "mensagens desde last_summary_at
--      (ou desde meia-noite local, se nunca resumido) ate a ultima mensagem
--      antes da pausa de 15min detectada"
-- NULL = conversa nunca foi resumida ainda.
ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS last_summary_at TIMESTAMPTZ;

-- Indice parcial pra acelerar o scan do cron: so interessa conversas com
-- atividade recente e que podem precisar de resumo.
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON conversations (last_message_at)
  WHERE last_message_at IS NOT NULL;
