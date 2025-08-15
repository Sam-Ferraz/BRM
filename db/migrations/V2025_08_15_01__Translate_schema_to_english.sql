-- Migration to translate database schema from Portuguese to English
-- V2025_08_15_01__Translate_schema_to_english.sql

-- Step 1: Rename tables
ALTER TABLE atendimentos RENAME TO appointments;
ALTER TABLE clientes RENAME TO clients;
ALTER TABLE negocios RENAME TO deals;
ALTER TABLE pauta_vendas RENAME TO sales_agenda;
ALTER TABLE produtos RENAME TO products;

-- Step 2: Rename sequences
ALTER SEQUENCE atendimentos_id_seq RENAME TO appointments_id_seq;
ALTER SEQUENCE clientes_id_seq RENAME TO clients_id_seq;
ALTER SEQUENCE negocios_id_seq RENAME TO deals_id_seq;
ALTER SEQUENCE pauta_vendas_id_seq RENAME TO sales_agenda_id_seq;
ALTER SEQUENCE produtos_id_seq RENAME TO products_id_seq;

-- Step 3: Update sequence ownership
ALTER SEQUENCE appointments_id_seq OWNED BY appointments.id;
ALTER SEQUENCE clients_id_seq OWNED BY clients.id;
ALTER SEQUENCE deals_id_seq OWNED BY deals.id;
ALTER SEQUENCE sales_agenda_id_seq OWNED BY sales_agenda.id;
ALTER SEQUENCE products_id_seq OWNED BY products.id;

-- Step 4: Rename columns in appointments table
ALTER TABLE appointments RENAME COLUMN cliente TO client;
ALTER TABLE appointments RENAME COLUMN tipo TO type;
ALTER TABLE appointments RENAME COLUMN descricao TO description;
ALTER TABLE appointments RENAME COLUMN datetime_agendamento TO scheduled_datetime;

-- Step 5: Rename columns in clients table
ALTER TABLE clients RENAME COLUMN nome TO name;
ALTER TABLE clients RENAME COLUMN telefone TO phone;
ALTER TABLE clients RENAME COLUMN cidade TO city;
ALTER TABLE clients RENAME COLUMN endereco TO address;
ALTER TABLE clients RENAME COLUMN empresa TO company;

-- Step 6: Rename columns in deals table
ALTER TABLE deals RENAME COLUMN cliente TO client;
ALTER TABLE deals RENAME COLUMN valor TO value;
ALTER TABLE deals RENAME COLUMN data TO date;
ALTER TABLE deals RENAME COLUMN descricao TO description;

-- Step 7: Rename columns in sales_agenda table
ALTER TABLE sales_agenda RENAME COLUMN titulo TO title;
ALTER TABLE sales_agenda RENAME COLUMN cliente TO client;
ALTER TABLE sales_agenda RENAME COLUMN valor TO value;
ALTER TABLE sales_agenda RENAME COLUMN data TO date;

-- Step 8: Rename columns in products table
ALTER TABLE products RENAME COLUMN nome TO name;
ALTER TABLE products RENAME COLUMN preco TO price;
ALTER TABLE products RENAME COLUMN categoria TO category;
ALTER TABLE products RENAME COLUMN estoque TO stock;
ALTER TABLE products RENAME COLUMN descricao TO description;

-- Step 9: Rename enum types (optional - keeping Portuguese values but renaming types)
ALTER TYPE atendimento_status RENAME TO appointment_status;
ALTER TYPE atendimento_tipo RENAME TO appointment_type;
ALTER TYPE cliente_tipo RENAME TO client_type;
ALTER TYPE negocio_status RENAME TO deal_status;
ALTER TYPE produto_status RENAME TO product_status;

-- Step 10: Update primary key constraint names
ALTER TABLE appointments RENAME CONSTRAINT atendimentos_pkey TO appointments_pkey;
ALTER TABLE clients RENAME CONSTRAINT clientes_pkey TO clients_pkey;
ALTER TABLE deals RENAME CONSTRAINT negocios_pkey TO deals_pkey;
ALTER TABLE sales_agenda RENAME CONSTRAINT pauta_vendas_pkey TO sales_agenda_pkey;
ALTER TABLE products RENAME CONSTRAINT produtos_pkey TO products_pkey;