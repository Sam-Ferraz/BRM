-- BASELINE do sistema de tracking automático de migrations.
--
-- Esta migration é especial:
--   1. Cria a tabela applied_migrations (controle de quais migrations já rodaram)
--   2. Marca como aplicadas TODAS as migrations que existiam no repo antes da
--      introdução do workflow .github/workflows/migrate.yml. Isso evita que o
--      workflow tente re-aplicar migrations cujas mudanças já estão no banco.
--   3. Marca a si própria como aplicada.
--
-- Ordem alfabética garante que V0__ rode antes de V2025__/V2026__, então o
-- baseline acontece antes do workflow tentar aplicar qualquer outra migration.
--
-- Toda nova migration daqui em diante (V2026_06_23_02 em diante) NÃO deve ser
-- listada aqui — vai rodar normalmente quando o workflow detectar.

CREATE TABLE IF NOT EXISTS applied_migrations (
  filename    VARCHAR(255) PRIMARY KEY,
  applied_at  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Pré-marca como aplicadas todas as migrations que já estavam no banco antes
-- do sistema de tracking existir. Idempotente (ON CONFLICT DO NOTHING).
INSERT INTO applied_migrations (filename) VALUES
  ('V2025_08_14_01__Merge_atendimentos_date_time.sql'),
  ('V2025_08_14_02__Add_user_preferences.sql'),
  ('V2025_08_15_01__Translate_schema_to_english.sql'),
  ('V2025_08_27_01__Add_product_to_sales_agenda.sql'),
  ('V2025_08_27_21_01__Remove_client_and_value_from_sales_agenda.sql'),
  ('V2025_08_27_21_02__Add_answered_column_to_appointments.sql'),
  ('V2025_08_28_01__add_client_origin.sql'),
  ('V2025_08_28_02__update_deal_status_options.sql'),
  ('V2025_08_28_03__Add_product_images.sql'),
  ('V2025_08_28_04__Add_multiple_product_images.sql'),
  ('V2025_08_29_01__Change_price_to_decimal.sql'),
  ('V2025_08_31_01__Remove_stock_from_products.sql'),
  ('V2025_11_09_01__Remove_status_from_appointments.sql'),
  ('V2025_11_09_02__Add_property_name_to_appointments.sql'),
  ('V2025_11_09_03__Update_deals_schema.sql'),
  ('V2025_11_10_02__Rename_product_category_to_type.sql'),
  ('V2025_11_10_03__Add_product_category.sql'),
  ('V2025_11_10_04__Drop_clients_company.sql'),
  ('V2025_12_03_01__Create_followups_table.sql'),
  ('V2025_12_03_02__Add_user_id_to_entities.sql'),
  ('V2026_04_15_01__Update_deal_status_and_remove_temperature.sql'),
  ('V2026_04_15_02__Fix_deal_status_enum.sql'),
  ('V2026_04_17_01__Add_property_fields_to_products.sql'),
  ('V2026_05_17_01__Add_client_name_to_followups.sql'),
  ('V2026_05_17_02__Create_proposals_table.sql'),
  ('V2026_05_20_01__Create_chat_tables.sql'),
  ('V2026_05_20_02__Create_leads_tables.sql'),
  ('V2026_06_19_01__Add_origin_and_conversation_to_appointments.sql'),
  ('V2026_06_23_01__Add_exclusivity_to_products.sql')
  -- NÃO incluir V2026_06_23_02 (Add_proposal_financial_fields) — essa é a
  -- migration que ainda precisa rodar nos bancos.
ON CONFLICT (filename) DO NOTHING;

-- Marca o próprio baseline como aplicado.
INSERT INTO applied_migrations (filename) VALUES
  ('V0__migration_tracking_baseline.sql')
ON CONFLICT (filename) DO NOTHING;
