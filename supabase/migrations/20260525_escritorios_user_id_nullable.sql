-- Permite criar escritório pelo painel admin ANTES de existir um usuário-dono.
--
-- Contexto: o modelo original (self-signup) criava escritório + dono juntos, então
-- escritorios.user_id era NOT NULL. No provisionamento via admin (criar o escritório
-- e depois convidar o gestor), não há dono no momento da criação — o admin insere
-- apenas { nome }. Por isso user_id precisa ser opcional.
--
-- A constraint UNIQUE é mantida: o Postgres permite múltiplos NULL (NULLs são
-- distintos), e quando um dono real for atribuído a unicidade continua valendo.

alter table public.escritorios alter column user_id drop not null;
