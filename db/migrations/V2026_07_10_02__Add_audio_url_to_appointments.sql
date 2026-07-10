-- V2026_07_10_02__Add_audio_url_to_appointments.sql
--
-- Adiciona campo audio_url em appointments pra suportar gravação de áudio.
-- Corretor grava audio no celular durante/após atendimento, transcrição via
-- Web Speech API do browser vai pro campo description, e o arquivo de áudio
-- fica guardado (S3 ou local) pra auditoria.
--
-- Idempotente.

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS audio_url TEXT;
