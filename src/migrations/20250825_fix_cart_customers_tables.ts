import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // First, ensure the customers table exists
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "customers" (
      "id" serial PRIMARY KEY NOT NULL,
      "uname" varchar NOT NULL,
      "email" varchar NOT NULL,
      "role" varchar DEFAULT 'customer',
      "salt" varchar,
      "hash" varchar,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // Add any missing columns to customers table if it already exists
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'uname'
      ) THEN
        ALTER TABLE customers ADD COLUMN uname varchar;
      END IF;
    END $$;
  `)

  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'email'
      ) THEN
        ALTER TABLE customers ADD COLUMN email varchar;
      END IF;
    END $$;
  `)

  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'customers' 
        AND column_name = 'role'
      ) THEN
        ALTER TABLE customers ADD COLUMN role varchar DEFAULT 'customer';
      END IF;
    END $$;
  `)

  // Create the cart table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cart" (
      "id" serial PRIMARY KEY NOT NULL,
      "user_id" integer,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );
  `)

  // Add user_id column if cart table exists but doesn't have it
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cart' 
        AND column_name = 'user_id'
      ) THEN
        ALTER TABLE cart ADD COLUMN user_id integer;
      END IF;
    END $$;
  `)

  // Create cart_rels table for domain relationships
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "cart_rels" (
      "id" serial PRIMARY KEY NOT NULL,
      "order" integer,
      "parent_id" integer NOT NULL,
      "path" varchar NOT NULL,
      "domains_id" integer
    );
  `)

  // Clean up any orphaned cart records before adding foreign key
  await db.execute(sql`
    DELETE FROM cart 
    WHERE user_id IS NOT NULL 
    AND user_id NOT IN (SELECT id FROM customers);
  `)

  // Add foreign key constraint for cart user relationship if it doesn't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_user_id_customers_id_fk'
      ) THEN
        ALTER TABLE cart ADD CONSTRAINT cart_user_id_customers_id_fk 
          FOREIGN KEY ("user_id") REFERENCES customers("id") ON DELETE set null;
      END IF;
    END $$;
  `)

  // Add foreign key constraint for cart_rels parent relationship
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cart_rels_parent_fk'
      ) THEN
        ALTER TABLE cart_rels ADD CONSTRAINT cart_rels_parent_fk 
          FOREIGN KEY ("parent_id") REFERENCES cart("id") ON DELETE cascade;
      END IF;
    END $$;
  `)

  // Create indexes
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "cart_user_idx" ON "cart" USING btree ("user_id");
    CREATE INDEX IF NOT EXISTS "cart_updated_at_idx" ON "cart" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "cart_created_at_idx" ON "cart" USING btree ("created_at");
    CREATE INDEX IF NOT EXISTS "cart_rels_order_idx" ON "cart_rels" USING btree ("order");
    CREATE INDEX IF NOT EXISTS "cart_rels_parent_idx" ON "cart_rels" USING btree ("parent_id");
    CREATE INDEX IF NOT EXISTS "cart_rels_path_idx" ON "cart_rels" USING btree ("path");
    CREATE INDEX IF NOT EXISTS "customers_updated_at_idx" ON "customers" USING btree ("updated_at");
    CREATE INDEX IF NOT EXISTS "customers_created_at_idx" ON "customers" USING btree ("created_at");
    CREATE UNIQUE INDEX IF NOT EXISTS "customers_email_idx" ON "customers" USING btree ("email");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop cart_rels table
  await db.execute(sql`
    DROP TABLE IF EXISTS "cart_rels" CASCADE;
  `)

  // Drop cart table
  await db.execute(sql`
    DROP TABLE IF EXISTS "cart" CASCADE;
  `)

  // Note: We're not dropping the customers table as it might be used by other collections
}