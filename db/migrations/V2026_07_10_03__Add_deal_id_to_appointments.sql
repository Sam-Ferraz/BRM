-- Adiciona referência opcional do atendimento pro negócio.
-- O corretor pode vincular o atendimento a um Deal via código (N-XXXX)
-- tanto no fluxo manual quanto no fluxo por áudio (auto-detecção no transcript).
-- FK com ON DELETE SET NULL: se o Deal for apagado, o atendimento persiste
-- (a descrição/áudio ainda têm valor histórico) mas fica sem vínculo.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS deal_id INTEGER REFERENCES deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_deal_id
  ON appointments(deal_id)
  WHERE deal_id IS NOT NULL;
