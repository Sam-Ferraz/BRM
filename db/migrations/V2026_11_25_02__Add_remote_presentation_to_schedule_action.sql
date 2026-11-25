-- Terceira opcao de agendamento: apresentacao remota (video chamada).
-- Expande o CHECK existente pra aceitar 'remote_presentation' ao lado
-- de 'meeting' e 'visit'.

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_schedule_action_check;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_schedule_action_check
  CHECK (schedule_action IS NULL OR schedule_action IN ('meeting', 'visit', 'remote_presentation'));
