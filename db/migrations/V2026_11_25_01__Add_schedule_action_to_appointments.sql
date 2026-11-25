-- Novo tipo de atendimento: 'schedule' (Agendamento).
-- Workflow igual ao follow-up — representa compromisso futuro agendado com
-- o cliente (reuniao ou visita). Coluna schedule_action guarda a acao prevista.
--
-- A tabela appointments nao tem CHECK no campo type, entao basta adicionar
-- a coluna auxiliar. A auto-criacao de follow-up correspondente fica a cargo
-- do AppointmentService.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS schedule_action VARCHAR(20) NULL;

-- Garantia de integridade: so aceita 'meeting' ou 'visit' quando preenchido.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_schedule_action_check'
  ) THEN
    ALTER TABLE appointments
      ADD CONSTRAINT appointments_schedule_action_check
      CHECK (schedule_action IS NULL OR schedule_action IN ('meeting', 'visit'));
  END IF;
END $$;

-- Index parcial pra consultas rapidas de agendamentos na agenda e no chart.
CREATE INDEX IF NOT EXISTS idx_appointments_schedule
  ON appointments(scheduled_datetime)
  WHERE type = 'schedule';
