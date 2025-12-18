#!/bin/bash

echo "🔧 Corrigindo histórico de migrations..."

# Marcar como reverted as migrations antigas que não existem mais
supabase migration repair --status reverted 20250911072653
supabase migration repair --status reverted 20250911074109
supabase migration repair --status reverted 20250911112523
supabase migration repair --status reverted 20250911113040
supabase migration repair --status reverted 20250911115344
supabase migration repair --status reverted 20250911115509
supabase migration repair --status reverted 20250911120745
supabase migration repair --status reverted 20250919011302
supabase migration repair --status reverted 20250919075805
supabase migration repair --status reverted 20250919124900
supabase migration repair --status reverted 20250919125228
supabase migration repair --status reverted 20250922051013
supabase migration repair --status reverted 20250922051108
supabase migration repair --status reverted 20250922051202
supabase migration repair --status reverted 20250922051309
supabase migration repair --status reverted 20250922051348
supabase migration repair --status reverted 20250922053045
supabase migration repair --status reverted 20250922063324
supabase migration repair --status reverted 20250923054809
supabase migration repair --status reverted 20250923055113
supabase migration repair --status reverted 20250923073538
supabase migration repair --status reverted 20250924045218
supabase migration repair --status reverted 20250924045245
supabase migration repair --status reverted 20250924045316
supabase migration repair --status reverted 20250924050559
supabase migration repair --status reverted 20250924050909
supabase migration repair --status reverted 20250924052920
supabase migration repair --status reverted 20250925010309
supabase migration repair --status reverted 20250927023207
supabase migration repair --status reverted 20250929052409
supabase migration repair --status reverted 20250929082619
supabase migration repair --status reverted 20251007032006
supabase migration repair --status reverted 20251007032031

echo "✅ Migrations marcadas como revertidas"
echo ""
echo "🔄 Agora você pode executar: npx supabase db push"

