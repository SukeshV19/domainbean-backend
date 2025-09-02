-- Fix Production Database Schema for Domainbean
-- This script adds missing columns to existing tables and creates new tables
-- Run this on the production database to fix the current issues

-- Step 1: Create enum types if they don't exist
DO $$ BEGIN
  CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'reader');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."enum_blogs_category" AS ENUM('Domains', 'Pricing', 'Hosting', 'Security', 'Uses');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Step 2: Add missing columns to users table
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role "enum_users_role" DEFAULT 'reader' NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'enable_a_p_i_key') THEN
    ALTER TABLE users ADD COLUMN enable_a_p_i_key boolean;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'api_key') THEN
    ALTER TABLE users ADD COLUMN api_key varchar;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'api_key_index') THEN
    ALTER TABLE users ADD COLUMN api_key_index varchar;
  END IF;
END $$;

-- Step 3: Create users_sessions table
CREATE TABLE IF NOT EXISTS "users_sessions" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "created_at" timestamp(3) with time zone,
  "expires_at" timestamp(3) with time zone NOT NULL
);

-- Add foreign key and indexes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'users_sessions_parent_id_fk') THEN
    ALTER TABLE users_sessions ADD CONSTRAINT users_sessions_parent_id_fk 
      FOREIGN KEY ("_parent_id") REFERENCES users("id") ON DELETE cascade;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");

-- Step 4: Create Blogs and related tables
CREATE TABLE IF NOT EXISTS "blogs" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "short_note" varchar,
  "category" "enum_blogs_category",
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "blogs_images" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "image_id" integer
);

CREATE TABLE IF NOT EXISTS "blogs_sections" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "heading" varchar,
  "image_id" integer,
  "content" jsonb
);

-- Step 5: Create Tables and related tables
CREATE TABLE IF NOT EXISTS "tables" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" varchar NOT NULL,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "tables_headers" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "header" varchar NOT NULL
);

CREATE TABLE IF NOT EXISTS "tables_rows" (
  "_order" integer NOT NULL,
  "_parent_id" integer NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS "tables_rows_cells" (
  "_order" integer NOT NULL,
  "_parent_id" varchar NOT NULL,
  "id" varchar PRIMARY KEY NOT NULL,
  "value" varchar
);

-- Step 6: Create Customers table
CREATE TABLE IF NOT EXISTS "customers" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "email" varchar NOT NULL,
  "phone" varchar,
  "company" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- Step 7: Create Domains table
CREATE TABLE IF NOT EXISTS "domains" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "extension" varchar NOT NULL,
  "price" numeric NOT NULL,
  "status" varchar DEFAULT 'available',
  "description" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- Step 8: Create Sales table
CREATE TABLE IF NOT EXISTS "sales" (
  "id" serial PRIMARY KEY NOT NULL,
  "domain_id" integer,
  "customer_id" integer,
  "price" numeric NOT NULL,
  "status" varchar DEFAULT 'pending',
  "payment_method" varchar,
  "transaction_id" varchar,
  "notes" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- Step 9: Create DomainViews table
CREATE TABLE IF NOT EXISTS "domain_views" (
  "id" serial PRIMARY KEY NOT NULL,
  "domain_id" integer,
  "ip_address" varchar,
  "user_agent" varchar,
  "referrer" varchar,
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- Step 10: Create Leads table
CREATE TABLE IF NOT EXISTS "leads" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar NOT NULL,
  "email" varchar NOT NULL,
  "phone" varchar,
  "message" varchar,
  "source" varchar,
  "status" varchar DEFAULT 'new',
  "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);

-- Step 11: Add all foreign key constraints
DO $$ 
BEGIN
  -- Blogs foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blogs_images_parent_id_fk') THEN
    ALTER TABLE blogs_images ADD CONSTRAINT blogs_images_parent_id_fk 
      FOREIGN KEY ("_parent_id") REFERENCES blogs("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blogs_images_image_id_media_id_fk') THEN
    ALTER TABLE blogs_images ADD CONSTRAINT blogs_images_image_id_media_id_fk 
      FOREIGN KEY ("image_id") REFERENCES media("id") ON DELETE set null;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blogs_sections_parent_id_fk') THEN
    ALTER TABLE blogs_sections ADD CONSTRAINT blogs_sections_parent_id_fk 
      FOREIGN KEY ("_parent_id") REFERENCES blogs("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'blogs_sections_image_id_media_id_fk') THEN
    ALTER TABLE blogs_sections ADD CONSTRAINT blogs_sections_image_id_media_id_fk 
      FOREIGN KEY ("image_id") REFERENCES media("id") ON DELETE set null;
  END IF;
  
  -- Tables foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tables_headers_parent_id_fk') THEN
    ALTER TABLE tables_headers ADD CONSTRAINT tables_headers_parent_id_fk 
      FOREIGN KEY ("_parent_id") REFERENCES tables("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tables_rows_parent_id_fk') THEN
    ALTER TABLE tables_rows ADD CONSTRAINT tables_rows_parent_id_fk 
      FOREIGN KEY ("_parent_id") REFERENCES tables("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'tables_rows_cells_parent_id_fk') THEN
    ALTER TABLE tables_rows_cells ADD CONSTRAINT tables_rows_cells_parent_id_fk 
      FOREIGN KEY ("_parent_id") REFERENCES tables_rows("id") ON DELETE cascade;
  END IF;
  
  -- Sales foreign keys
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sales_domain_id_fk') THEN
    ALTER TABLE sales ADD CONSTRAINT sales_domain_id_fk 
      FOREIGN KEY ("domain_id") REFERENCES domains("id") ON DELETE set null;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'sales_customer_id_fk') THEN
    ALTER TABLE sales ADD CONSTRAINT sales_customer_id_fk 
      FOREIGN KEY ("customer_id") REFERENCES customers("id") ON DELETE set null;
  END IF;
  
  -- DomainViews foreign key
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'domain_views_domain_id_fk') THEN
    ALTER TABLE domain_views ADD CONSTRAINT domain_views_domain_id_fk 
      FOREIGN KEY ("domain_id") REFERENCES domains("id") ON DELETE cascade;
  END IF;
END $$;

-- Step 12: Create indexes for all new tables
CREATE INDEX IF NOT EXISTS "blogs_updated_at_idx" ON "blogs" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "blogs_created_at_idx" ON "blogs" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "blogs_images_order_idx" ON "blogs_images" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "blogs_images_parent_id_idx" ON "blogs_images" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "blogs_images_image_idx" ON "blogs_images" USING btree ("image_id");
CREATE INDEX IF NOT EXISTS "blogs_sections_order_idx" ON "blogs_sections" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "blogs_sections_parent_id_idx" ON "blogs_sections" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "blogs_sections_image_idx" ON "blogs_sections" USING btree ("image_id");
CREATE INDEX IF NOT EXISTS "tables_updated_at_idx" ON "tables" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "tables_created_at_idx" ON "tables" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "tables_headers_order_idx" ON "tables_headers" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tables_headers_parent_id_idx" ON "tables_headers" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "tables_rows_order_idx" ON "tables_rows" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tables_rows_parent_id_idx" ON "tables_rows" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "tables_rows_cells_order_idx" ON "tables_rows_cells" USING btree ("_order");
CREATE INDEX IF NOT EXISTS "tables_rows_cells_parent_id_idx" ON "tables_rows_cells" USING btree ("_parent_id");
CREATE INDEX IF NOT EXISTS "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "customers_created_at_idx" ON "customers" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" USING btree ("email");
CREATE INDEX IF NOT EXISTS "domains_updated_at_idx" ON "domains" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "domains_created_at_idx" ON "domains" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "sales_updated_at_idx" ON "sales" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "sales_created_at_idx" ON "sales" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "sales_domain_id_idx" ON "sales" USING btree ("domain_id");
CREATE INDEX IF NOT EXISTS "sales_customer_id_idx" ON "sales" USING btree ("customer_id");
CREATE INDEX IF NOT EXISTS "domain_views_updated_at_idx" ON "domain_views" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "domain_views_created_at_idx" ON "domain_views" USING btree ("created_at");
CREATE INDEX IF NOT EXISTS "domain_views_domain_id_idx" ON "domain_views" USING btree ("domain_id");
CREATE INDEX IF NOT EXISTS "leads_updated_at_idx" ON "leads" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "leads_created_at_idx" ON "leads" USING btree ("created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "leads_email_idx" ON "leads" USING btree ("email");

-- Step 13: Update payload_locked_documents_rels table to include new collections
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'customers_id') THEN
    ALTER TABLE payload_locked_documents_rels ADD COLUMN customers_id integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'domains_id') THEN
    ALTER TABLE payload_locked_documents_rels ADD COLUMN domains_id integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'sales_id') THEN
    ALTER TABLE payload_locked_documents_rels ADD COLUMN sales_id integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'domain_views_id') THEN
    ALTER TABLE payload_locked_documents_rels ADD COLUMN domain_views_id integer;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payload_locked_documents_rels' AND column_name = 'leads_id') THEN
    ALTER TABLE payload_locked_documents_rels ADD COLUMN leads_id integer;
  END IF;
END $$;

-- Add foreign key constraints for payload_locked_documents_rels
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_customers_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_customers_fk 
      FOREIGN KEY ("customers_id") REFERENCES customers("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_domains_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_domains_fk 
      FOREIGN KEY ("domains_id") REFERENCES domains("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_sales_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_sales_fk 
      FOREIGN KEY ("sales_id") REFERENCES sales("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_domain_views_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_domain_views_fk 
      FOREIGN KEY ("domain_views_id") REFERENCES domain_views("id") ON DELETE cascade;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'payload_locked_documents_rels_leads_fk') THEN
    ALTER TABLE payload_locked_documents_rels ADD CONSTRAINT payload_locked_documents_rels_leads_fk 
      FOREIGN KEY ("leads_id") REFERENCES leads("id") ON DELETE cascade;
  END IF;
END $$;

-- Create indexes for new columns in payload_locked_documents_rels
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_customers_id_idx" ON "payload_locked_documents_rels" USING btree ("customers_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_domains_id_idx" ON "payload_locked_documents_rels" USING btree ("domains_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_sales_id_idx" ON "payload_locked_documents_rels" USING btree ("sales_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_domain_views_id_idx" ON "payload_locked_documents_rels" USING btree ("domain_views_id");
CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_leads_id_idx" ON "payload_locked_documents_rels" USING btree ("leads_id");

-- Step 14: Update the payload_migrations table to mark this as completed
-- NOTE: Only run this after all above steps complete successfully
INSERT INTO payload_migrations (name, batch, updated_at, created_at)
VALUES ('20250809_fix_existing_schema', 2, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;