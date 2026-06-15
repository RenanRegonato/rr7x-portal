-- ============================================================
-- Consumo atômico do pacote de créditos (2026-06-12)
-- ============================================================
-- Evita furar o saldo sob concorrência (duas análises simultâneas liam o mesmo
-- analises_consumidas e ambas passavam). Seleciona o pacote ativo mais antigo
-- com saldo (FIFO) com lock e incrementa num único statement.
-- ============================================================

CREATE OR REPLACE FUNCTION public.consumir_pacote_fifo(p_escritorio_id uuid)
RETURNS TABLE (pacote_id uuid, novo_consumido int)
LANGUAGE plpgsql AS $$
DECLARE
  v_id   uuid;
  v_novo int;
BEGIN
  SELECT id INTO v_id
  FROM public.pacotes
  WHERE escritorio_id = p_escritorio_id
    AND status = 'ativo'
    AND analises_consumidas < analises_total
  ORDER BY criado_em ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_id IS NULL THEN
    RETURN;  -- nenhum pacote ativo com saldo
  END IF;

  UPDATE public.pacotes
     SET analises_consumidas = analises_consumidas + 1,
         atualizado_em = now()
   WHERE id = v_id
  RETURNING analises_consumidas INTO v_novo;

  pacote_id := v_id;
  novo_consumido := v_novo;
  RETURN NEXT;
END;
$$;

-- Devolve 1 unidade (revert quando a criação da análise falha após consumir).
CREATE OR REPLACE FUNCTION public.devolver_pacote(p_pacote_id uuid)
RETURNS void
LANGUAGE sql AS $$
  UPDATE public.pacotes
     SET analises_consumidas = GREATEST(0, analises_consumidas - 1),
         atualizado_em = now()
   WHERE id = p_pacote_id;
$$;
