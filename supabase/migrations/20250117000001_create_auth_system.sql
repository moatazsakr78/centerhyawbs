-- Create auth system schema (separate from business data)
CREATE SCHEMA IF NOT EXISTS auth_system;

-- Users table (for NextAuth.js)
CREATE TABLE auth_system.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  email_verified TIMESTAMPTZ,
  name VARCHAR(255),
  image TEXT,
  password_hash TEXT,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions table (for NextAuth.js JWT sessions)
CREATE TABLE auth_system.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
  expires TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accounts table (for OAuth providers like Google)
CREATE TABLE auth_system.accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth_system.users(id) ON DELETE CASCADE,
  type VARCHAR(255) NOT NULL,
  provider VARCHAR(255) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type VARCHAR(255),
  scope TEXT,
  id_token TEXT,
  session_state VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

-- Verification tokens (for email verification)
CREATE TABLE auth_system.verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Indexes for performance
CREATE INDEX idx_users_email ON auth_system.users(email);
CREATE INDEX idx_sessions_token ON auth_system.sessions(session_token);
CREATE INDEX idx_sessions_user ON auth_system.sessions(user_id);
CREATE INDEX idx_accounts_user ON auth_system.accounts(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION auth_system.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON auth_system.users
    FOR EACH ROW EXECUTE FUNCTION auth_system.update_updated_at_column();

-- Grant permissions (optional, adjust as needed)
GRANT USAGE ON SCHEMA auth_system TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA auth_system TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA auth_system TO authenticated;
