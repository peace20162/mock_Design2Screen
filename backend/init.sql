-- SBG Gate LED Signage — PostgreSQL schema + seed (DEC-17, doc §5)
-- Runs on first `docker compose up` via /docker-entrypoint-initdb.d.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS airlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL,
  airline_id UUID REFERENCES airlines(id)
);

CREATE TABLE IF NOT EXISTS gates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS gate_screens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate_id UUID REFERENCES gates(id),
  screen_index INT NOT NULL,
  label TEXT,
  size TEXT,
  gdu_id TEXT
);

CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  airline_id UUID REFERENCES airlines(id),
  name TEXT,
  canvas_config JSONB
);

CREATE TABLE IF NOT EXISTS flights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flight_number TEXT,
  destination TEXT,
  gate_id UUID REFERENCES gates(id),
  status TEXT
);

CREATE TABLE IF NOT EXISTS active_screen_states (
  screen_id UUID PRIMARY KEY REFERENCES gate_screens(id),
  template_id UUID REFERENCES templates(id),
  flight_id UUID REFERENCES flights(id)
);

-- ----------------------------------------------------------------- seed

INSERT INTO airlines (code, name) VALUES
  ('TG', 'Thai Airways'),
  ('PG', 'Bangkok Airways'),
  ('SQ', 'Singapore Airlines'),
  ('FD', 'Thai AirAsia'),
  ('VZ', 'VietJet Air'),
  ('NH', 'All Nippon Airways')
ON CONFLICT (code) DO NOTHING;

INSERT INTO gates (name) VALUES ('D1'), ('D2'), ('D3'), ('D4'), ('C1'), ('C3')
ON CONFLICT (name) DO NOTHING;

-- password_hash holds a bcrypt hash in production; seed uses placeholders.
INSERT INTO users (username, password_hash, role) VALUES
  ('tg_staff', '$2b$10$placeholderplaceholderplaceholde', 'airline'),
  ('admin_it', '$2b$10$placeholderplaceholderplaceholde', 'admin')
ON CONFLICT (username) DO NOTHING;

INSERT INTO gate_screens (gate_id, screen_index, label, size, gdu_id)
SELECT g.id, s.i, s.label, s.size, 'GDU-' || g.name || '-S' || s.i
FROM gates g
JOIN (VALUES
  ('D1', 1, 'Primary',   '55"'),
  ('D1', 2, 'Secondary', '43"'),
  ('D2', 1, 'Main',      '55"'),
  ('D2', 2, 'Zone',      '43"'),
  ('D3', 1, 'Primary',   '55"'),
  ('D3', 2, 'Secondary', '43"'),
  ('D4', 1, 'Primary',   '55"'),
  ('D4', 2, 'Secondary', '43"'),
  ('C1', 1, 'Primary',   '55"'),
  ('C1', 2, 'Secondary', '43"'),
  ('C1', 3, 'Tertiary',  '43"'),
  ('C3', 1, 'Primary',   '55"'),
  ('C3', 2, 'Secondary', '43"')
) AS s(gname, i, label, size) ON g.name = s.gname
ON CONFLICT DO NOTHING;
