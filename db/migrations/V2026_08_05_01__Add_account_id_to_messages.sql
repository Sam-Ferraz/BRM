-- Corrige gap da migração multi-tenancy (V2026_07_27_01) que deixou messages
-- sem coluna account_id. O código do MessageRepository (INSERT e SELECT) já
-- usa account_id diretamente, então sem essa coluna toda tentativa de enviar
-- mensagem via /api/chat/conversations retornava HTTP 500 com o erro:
--   column "account_id" of relation "messages" does not exist
--
-- Mesma estrutura das outras tabelas: ADD nullable → UPDATE → SET NOT NULL + FK.

ALTER TABLE messages ADD COLUMN IF NOT EXISTS account_id INTEGER;

-- Popula account_id nas mensagens existentes a partir da conversation pai
UPDATE messages m
   SET account_id = c.account_id
  FROM conversations c
 WHERE c.id = m.conversation_id
   AND m.account_id IS NULL;

ALTER TABLE messages ALTER COLUMN account_id SET NOT NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_account') THEN
    ALTER TABLE messages ADD CONSTRAINT fk_messages_account
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_account ON messages(account_id);
