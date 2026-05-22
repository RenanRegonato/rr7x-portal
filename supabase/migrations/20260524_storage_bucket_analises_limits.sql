-- Garante que o bucket de documentos de análise ("analises") aceita os
-- arquivos reais que o cliente vai subir, sem bloqueios inesperados:
--   - file_size_limit = 25 MB  (acima da promessa de 20 MB/arquivo da UI)
--   - allowed_mime_types = NULL (sem restrição de tipo — a UI já filtra por extensão
--                                e o servidor sanitiza o nome do arquivo)
--
-- O bucket é criado pelo painel do Supabase (não por migration), então aqui apenas
-- ATUALIZAMOS a config existente. Não alteramos `public` (o bucket é privado e usa
-- signed URLs para upload/download).

update storage.buckets
set
  file_size_limit    = 26214400,   -- 25 MB em bytes
  allowed_mime_types = null
where id = 'analises';
