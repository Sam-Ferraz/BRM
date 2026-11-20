-- Remove a dimensao de temperatura (frio/morno/quente) dos status de deal.
-- Os status compostos sao mergeados nos 3 status base:
--   service_cold / service_mild / service_warm              -> service
--   visit_foreseen_cold / visit_foreseen_mild / visit_foreseen_warm -> visit_foreseen
--   visit_done_cold / visit_done_mild / visit_done_warm     -> visit_done
-- Os demais status (proposal, contract, sold, discarded_*) ficam inalterados.
--
-- A perda de informacao de temperatura e intencional — o usuario decidiu
-- simplificar o funil pra ter so 3 fases agregadas (ver mudanca correlata no
-- frontend e no DealFunnelChart).

UPDATE deals
SET status = 'service'
WHERE status IN ('service_cold', 'service_mild', 'service_warm');

UPDATE deals
SET status = 'visit_foreseen'
WHERE status IN ('visit_foreseen_cold', 'visit_foreseen_mild', 'visit_foreseen_warm');

UPDATE deals
SET status = 'visit_done'
WHERE status IN ('visit_done_cold', 'visit_done_mild', 'visit_done_warm');
