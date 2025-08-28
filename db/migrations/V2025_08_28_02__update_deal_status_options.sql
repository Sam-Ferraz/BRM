-- Update deal status options to new business requirements
-- Replace existing deal_status enum and update deals table

-- First, drop the existing deal_status enum if it exists (it's not used in deals table currently)
DROP TYPE IF EXISTS public.deal_status;

-- Create new deal_status enum with the required options
CREATE TYPE public.deal_status AS ENUM (
    'proposta',
    'venda_ganha', 
    'descartado',
    'fechado',
    'cancelado'
);

-- Update existing deals to map old statuses to new ones
UPDATE public.deals SET status = 
    CASE 
        WHEN status = 'Em Andamento' THEN 'proposta'
        WHEN status = 'Proposta' THEN 'proposta'
        WHEN status = 'Fechado' THEN 'fechado'
        ELSE 'proposta'
    END;

-- Change the status column to use the new enum type
ALTER TABLE public.deals ALTER COLUMN status DROP DEFAULT;
ALTER TABLE public.deals ALTER COLUMN status TYPE public.deal_status USING status::public.deal_status;
ALTER TABLE public.deals ALTER COLUMN status SET DEFAULT 'proposta';