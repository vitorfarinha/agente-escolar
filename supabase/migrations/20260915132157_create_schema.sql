-- Extensão necessária para embeddings
create extension if not exists vector;

-- === Estrutura escolar ===
create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  label text not null, -- ex: "2025/2026"
  start_date date,
  end_date date
);

create table cycles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  name text not null -- ex: "1º Ciclo"
);

create table year_groups (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid references cycles(id) not null,
  name text not null -- ex: "5º Ano"
);

create table classes (
  id uuid primary key default gen_random_uuid(),
  year_group_id uuid references year_groups(id) not null,
  academic_year_id uuid references academic_years(id) not null,
  name text not null -- ex: "5ºA"
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  name text not null, -- ex: "Natação", "Robótica"
  activity_type text,
  description text
);

-- === Pessoas ===
create table students (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  first_name text not null,
  last_name text not null,
  class_id uuid references classes(id),
  year_group_id uuid references year_groups(id),
  cycle_id uuid references cycles(id)
);

create table student_activities (
  student_id uuid references students(id) not null,
  activity_id uuid references activities(id) not null,
  enrolled_at date default now(),
  notes text,
  primary key (student_id, activity_id)
);

create table guardians (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  phone text unique,
  auth_user_id uuid references auth.users(id), -- ligação ao login Supabase Auth
  preferred_channel text default 'email'
);

create table guardian_students (
  guardian_id uuid references guardians(id) not null,
  student_id uuid references students(id) not null,
  relationship text, -- "mãe", "pai", "encarregado de educação"
  primary key (guardian_id, student_id)
);

-- Identidades por canal — permite reconhecer o mesmo encarregado
-- em email, WhatsApp, Telegram, ou app do Awl
create table channel_identities (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id) not null,
  channel text not null check (channel in ('email','whatsapp','sms','telegram','webapp','awl')),
  identifier text not null, -- email, número de telemóvel, ID do Telegram, etc.
  verified boolean default false,
  unique (channel, identifier)
);

-- === Repositório documental ===
create table documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) not null,
  title text not null,
  source_channel text not null check (source_channel in ('upload','email','api')),
  original_filename text,
  storage_path text, -- caminho no Supabase Storage
  raw_text text, -- texto extraído (PDF/email)
  received_at timestamptz default now(),
  document_date date -- data do evento a que se refere, se aplicável
);

-- Um documento pode ter vários âmbitos (ex: geral + turma específica)
create table document_scopes (
  document_id uuid references documents(id) not null,
  scope_type text not null check (scope_type in ('geral','ciclo','ano','turma','atividade','aluno')),
  scope_id uuid, -- id do ciclo/ano/turma/atividade/aluno; null se scope_type='geral'
  primary key (document_id, scope_type, scope_id)
);

create table document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) not null,
  chunk_index int not null,
  content text not null,
  embedding vector(1536)
);
create index on document_chunks using ivfflat (embedding vector_cosine_ops);

-- === Conversas ===
create table conversations (
  id uuid primary key default gen_random_uuid(),
  guardian_id uuid references guardians(id) not null,
  channel text not null,
  started_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) not null,
  sender text not null check (sender in ('guardian','agent')),
  content text not null,
  referenced_document_ids uuid[],
  created_at timestamptz default now()
);

-- === Lembretes/alertas proativos ===
create table reminders (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id),
  title text not null,
  due_date date not null,
  scope_type text not null,
  scope_id uuid,
  sent_at timestamptz
);

-- === Administração ===
create table admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) not null,
  role text default 'admin'
);
