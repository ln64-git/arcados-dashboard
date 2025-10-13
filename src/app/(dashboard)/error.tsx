'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  // Suppress unused parameter warning - reset is required by Next.js error boundary interface
  void reset;

  return (
    <main className="p-4 md:p-6">
      <div className="mb-8 space-y-4">
        <h1 className="font-semibold text-lg md:text-2xl">
          Please complete setup
        </h1>
        <p>
          Inside the Vercel Postgres dashboard, create a table based on the
          schema defined in this repository.
        </p>
        <pre className="my-4 px-3 py-4 bg-black text-white rounded-lg max-w-2xl overflow-scroll flex text-wrap">
          <code>
            {`CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  discord_id VARCHAR(255) NOT NULL,
  guild_id VARCHAR(255) NOT NULL,
  bot VARCHAR(255) DEFAULT 'false',
  username VARCHAR(255) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  discriminator VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  status VARCHAR(255),
  roles VARCHAR(255)[],
  joined_at TIMESTAMP NOT NULL,
  last_seen TIMESTAMP NOT NULL,
  avatar_history TEXT,
  username_history VARCHAR(255)[],
  display_name_history VARCHAR(255)[],
  status_history TEXT,
  emoji VARCHAR(255),
  title VARCHAR(255),
  summary TEXT,
  keywords VARCHAR(255)[],
  notes VARCHAR(255)[],
  relationships TEXT,
  mod_preferences TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);`}
          </code>
        </pre>
        <p>Insert a row for testing:</p>
        <pre className="my-4 px-3 py-4 bg-black text-white rounded-lg max-w-2xl overflow-scroll flex text-wrap">
          <code>
            {`INSERT INTO users (discord_id, guild_id, username, display_name, discriminator, joined_at, last_seen) 
VALUES ('123456789012345678', '1254694808228986912', 'testuser', 'Test User', '0001', NOW(), NOW());`}
          </code>
        </pre>
      </div>
    </main>
  );
}
