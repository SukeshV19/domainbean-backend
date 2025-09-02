import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  // Create enum type for user role if it doesn't exist
  await db.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'reader');
    EXCEPTION
      WHEN duplicate_object THEN null;
    END $$;
  `)

  // Add missing columns to users table if they don't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      -- Check and add role column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'role'
      ) THEN
        ALTER TABLE users ADD COLUMN role "enum_users_role" DEFAULT 'reader' NOT NULL;
      END IF;
      
      -- Check and add enable_a_p_i_key column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'enable_a_p_i_key'
      ) THEN
        ALTER TABLE users ADD COLUMN enable_a_p_i_key boolean DEFAULT false;
      END IF;
      
      -- Check and add api_key column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'api_key'
      ) THEN
        ALTER TABLE users ADD COLUMN api_key varchar;
      END IF;
      
      -- Check and add api_key_index column
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'api_key_index'
      ) THEN
        ALTER TABLE users ADD COLUMN api_key_index varchar;
      END IF;
    END $$;
  `)

  // Create users_sessions table if it doesn't exist
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "users_sessions" (
      "_order" integer NOT NULL,
      "_parent_id" integer NOT NULL,
      "id" varchar PRIMARY KEY NOT NULL,
      "created_at" timestamp(3) with time zone,
      "expires_at" timestamp(3) with time zone NOT NULL
    );
  `)

  // Add foreign key constraint for users_sessions if it doesn't exist
  await db.execute(sql`
    DO $$ 
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_sessions_parent_id_fk'
      ) THEN
        ALTER TABLE users_sessions ADD CONSTRAINT users_sessions_parent_id_fk 
          FOREIGN KEY ("_parent_id") REFERENCES users("id") ON DELETE cascade;
      END IF;
    END $$;
  `)

  // Create indexes for users_sessions if they don't exist
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
    CREATE INDEX IF NOT EXISTS "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // Drop users_sessions table
  await db.execute(sql`
    DROP TABLE IF EXISTS "users_sessions" CASCADE;
  `)

  // Remove columns from users table
  await db.execute(sql`
    ALTER TABLE users DROP COLUMN IF EXISTS role;
    ALTER TABLE users DROP COLUMN IF EXISTS enable_a_p_i_key;
    ALTER TABLE users DROP COLUMN IF EXISTS api_key;
    ALTER TABLE users DROP COLUMN IF EXISTS api_key_index;
  `)

  // Drop enum type
  await db.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_users_role";
  `)
}