import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Add minInc column to auctions table if it doesn't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auctions' 
        AND column_name = 'min_inc'
      ) THEN
        ALTER TABLE auctions ADD COLUMN min_inc numeric DEFAULT 1;
      END IF;
    END $$;
  `)

  // Create auctions_proxy table for the proxy array relationship
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "auctions_proxy" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "user_id" integer,
      "max_bid" numeric,
      "current_bid" numeric DEFAULT 0
    );
  `)

  // Add user_id column if it doesn't exist (for cases where table already exists)
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auctions_proxy' 
        AND column_name = 'user_id'
      ) THEN
        ALTER TABLE auctions_proxy ADD COLUMN user_id integer;
      END IF;
    END $$;
  `)

  // Add max_bid column if it doesn't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auctions_proxy' 
        AND column_name = 'max_bid'
      ) THEN
        ALTER TABLE auctions_proxy ADD COLUMN max_bid numeric;
      END IF;
    END $$;
  `)

  // Add current_bid column if it doesn't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auctions_proxy' 
        AND column_name = 'current_bid'
      ) THEN
        ALTER TABLE auctions_proxy ADD COLUMN current_bid numeric DEFAULT 0;
      END IF;
    END $$;
  `)

  // Add foreign key constraint for auctions_proxy parent relationship
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auctions_proxy_parent_id_fk'
      ) THEN
        ALTER TABLE auctions_proxy ADD CONSTRAINT auctions_proxy_parent_id_fk 
          FOREIGN KEY ("_parent_id") REFERENCES auctions("id") ON DELETE cascade;
      END IF;
    END $$;
  `)

  // Add foreign key constraint for auctions_proxy user relationship
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'auctions_proxy_user_id_fk'
      ) THEN
        ALTER TABLE auctions_proxy ADD CONSTRAINT auctions_proxy_user_id_fk 
          FOREIGN KEY ("user_id") REFERENCES customers("id") ON DELETE set null;
      END IF;
    END $$;
  `)

  // Create indexes for auctions_proxy
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "auctions_proxy_order_idx" ON "auctions_proxy" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "auctions_proxy_parent_id_idx" ON "auctions_proxy" USING btree ("_parent_id");
    CREATE INDEX IF NOT EXISTS "auctions_proxy_user_id_idx" ON "auctions_proxy" USING btree ("user_id");
  `)

  // Add isProxy flag to auctions_bids table if it doesn't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'auctions_bids' 
        AND column_name = 'is_proxy'
      ) THEN
        ALTER TABLE auctions_bids ADD COLUMN is_proxy boolean DEFAULT false;
      END IF;
    END $$;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop auctions_proxy table
  await db.execute(sql`
    DROP TABLE IF EXISTS "auctions_proxy" CASCADE;
  `)

  // Remove minInc column from auctions table
  await db.execute(sql`
    ALTER TABLE auctions DROP COLUMN IF EXISTS min_inc;
  `)

  // Remove isProxy column from auctions_bids table
  await db.execute(sql`
    ALTER TABLE auctions_bids DROP COLUMN IF EXISTS is_proxy;
  `)
}