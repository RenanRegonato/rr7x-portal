#!/bin/bash

# Script para disparar seed e ETL do Mapa Inteligente
# Uso: ./scripts/etl-seed.sh [seed|cvm|bcb|receita|embed]

set -e

API_URL="${API_URL:-https://www.mandor.com.br}"
ETL="${1:-seed}"

case "$ETL" in
  seed)
    echo "🌱 Disparando seed de teste..."
    curl -X POST "$API_URL/api/mapa-mercado/etl/seed" \
      -H "Content-Type: application/json" \
      -d '{}' | jq .
    ;;
  cvm|bcb|receita|embed)
    echo "🔄 Disparando ETL $ETL..."
    curl -X POST "$API_URL/api/mapa-mercado/etl/trigger" \
      -H "Content-Type: application/json" \
      -d "{\"etl\": \"$ETL\"}" | jq .
    ;;
  *)
    echo "Uso: $0 [seed|cvm|bcb|receita|embed]"
    echo ""
    echo "Exemplos:"
    echo "  $0 seed        # Carregar dados de teste (10 gestoras, 20 FIDCs)"
    echo "  $0 cvm         # Ingerir dados de fundos da CVM"
    echo "  $0 bcb         # Ingerir dados de bancos do BCB"
    echo "  $0 receita     # Enriquecer com dados da Receita Federal"
    echo "  $0 embed       # Gerar embeddings para busca semântica"
    exit 1
    ;;
esac
