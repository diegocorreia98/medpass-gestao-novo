
import { useMemo } from 'react';
import { useUnidades } from './useUnidades';

export interface StateData {
  state: string;
  count: number;
}

export const useMapData = () => {
  const { unidades, isLoading } = useUnidades();

  const stateData = useMemo(() => {
    if (!unidades || unidades.length === 0) return [];

    const stateCount = unidades.reduce((acc, unidade) => {
      if (unidade.estado) {
        const existing = acc.find(item => item.state === unidade.estado);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ state: unidade.estado, count: 1 });
        }
      }
      return acc;
    }, [] as StateData[]);

    return stateCount.sort((a, b) => b.count - a.count);
  }, [unidades]);

  return {
    stateData,
    isLoading,
    totalUnidades: unidades?.length || 0
  };
};
