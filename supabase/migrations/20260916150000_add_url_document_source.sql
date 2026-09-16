-- Permite ingerir uma página web como documento (snapshot único, sem
-- re-fetch periódico — equivalente a um PDF carregado, só que a fonte é
-- um URL em vez de um ficheiro).
alter table documents drop constraint documents_source_channel_check;
alter table documents add constraint documents_source_channel_check
  check (source_channel in ('upload', 'email', 'api', 'url'));

alter table documents add column source_url text;
