-- Etiquetas de Negocios (estilo Trello)
-- Usuario cria etiquetas nomeadas e coloridas por conta (multi-tenant).
-- Cada deal pode ter varias etiquetas (many-to-many via deal_label_assignments).

CREATE TABLE IF NOT EXISTS deal_labels (
  id          SERIAL PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name        VARCHAR(60) NOT NULL,
  color       VARCHAR(20) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (account_id, name)
);

CREATE INDEX IF NOT EXISTS idx_deal_labels_account ON deal_labels(account_id);

CREATE TABLE IF NOT EXISTS deal_label_assignments (
  deal_id   INTEGER NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  label_id  INTEGER NOT NULL REFERENCES deal_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (deal_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_deal_label_assignments_label ON deal_label_assignments(label_id);
CREATE INDEX IF NOT EXISTS idx_deal_label_assignments_deal ON deal_label_assignments(deal_id);
