import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const directUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!directUrl) {
  console.error("Missing DATABASE_URL or DIRECT_URL");
  process.exit(1);
}

const pool = new Pool({
  connectionString: directUrl,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_posts (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        subject TEXT NOT NULL,
        tags TEXT[] DEFAULT ARRAY[]::TEXT[],
        status TEXT NOT NULL DEFAULT 'open',
        votes INT NOT NULL DEFAULT 0,
        views INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_subject_created_at ON forum_posts(subject, created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_posts_status_created_at ON forum_posts(status, created_at);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_answers (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        is_accepted BOOLEAN NOT NULL DEFAULT false,
        votes INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_forum_answers_post_id_created_at ON forum_answers(post_id, created_at);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_votes (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT REFERENCES forum_posts(id) ON DELETE CASCADE,
        answer_id TEXT REFERENCES forum_answers(id) ON DELETE CASCADE,
        direction INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, post_id),
        UNIQUE (user_id, answer_id),
        CHECK (post_id IS NOT NULL OR answer_id IS NOT NULL)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS forum_bookmarks (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        post_id TEXT NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (user_id, post_id)
      );
    `);

    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = now();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_forum_posts_updated_at ON forum_posts;
      CREATE TRIGGER update_forum_posts_updated_at
        BEFORE UPDATE ON forum_posts
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_forum_answers_updated_at ON forum_answers;
      CREATE TRIGGER update_forum_answers_updated_at
        BEFORE UPDATE ON forum_answers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_forum_votes_updated_at ON forum_votes;
      CREATE TRIGGER update_forum_votes_updated_at
        BEFORE UPDATE ON forum_votes
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    await client.query("COMMIT");
    console.log("Forum tables created successfully.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating forum tables:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
