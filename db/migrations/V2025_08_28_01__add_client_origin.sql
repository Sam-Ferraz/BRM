-- Add origin field to clients table
CREATE TYPE public.client_origin AS ENUM (
    'online_lead',
    'own_portfolio', 
    'duty_shift',
    'referral',
    'street_client'
);

ALTER TABLE public.clients ADD COLUMN origin public.client_origin;

-- Set a default value for existing clients
UPDATE public.clients SET origin = 'own_portfolio' WHERE origin IS NULL;