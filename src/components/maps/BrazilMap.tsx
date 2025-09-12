
import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StateData {
  state: string;
  count: number;
}

interface BrazilMapProps {
  data: StateData[];
  isLoading?: boolean;
}

const BrazilMap: React.FC<BrazilMapProps> = ({ data, isLoading }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);

  // State abbreviation mapping
  const stateAbbreviations: Record<string, string> = {
    'Acre': 'AC',
    'Alagoas': 'AL',
    'Amapá': 'AP',
    'Amazonas': 'AM',
    'Bahia': 'BA',
    'Ceará': 'CE',
    'Espírito Santo': 'ES',
    'Goiás': 'GO',
    'Maranhão': 'MA',
    'Mato Grosso': 'MT',
    'Mato Grosso do Sul': 'MS',
    'Minas Gerais': 'MG',
    'Pará': 'PA',
    'Paraíba': 'PB',
    'Paraná': 'PR',
    'Pernambuco': 'PE',
    'Piauí': 'PI',
    'Rio de Janeiro': 'RJ',
    'Rio Grande do Norte': 'RN',
    'Rio Grande do Sul': 'RS',
    'Rondônia': 'RO',
    'Roraima': 'RR',
    'Santa Catarina': 'SC',
    'São Paulo': 'SP',
    'Sergipe': 'SE',
    'Tocantins': 'TO',
    'Distrito Federal': 'DF'
  };

  // Buscar token do Mapbox via edge function segura
  useEffect(() => {
    const fetchMapboxToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-proxy');
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (err) {
        console.error('Erro ao buscar token do Mapbox:', err);
        setError('Erro ao carregar configuração do mapa.');
      }
    };

    fetchMapboxToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-51.9253, -14.2350], // Center of Brazil
        zoom: 3.5,
        maxZoom: 8,
        minZoom: 2
      });

      map.current.addControl(new mapboxgl.NavigationControl({
        showCompass: false,
        showZoom: true
      }), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
        if (map.current) {
          // Add Brazil states boundaries
          map.current.addSource('brazil-states', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: [] // We'll use a simple approach with markers for now
            }
          });
        }
      });

      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setError('Erro ao carregar o mapa. Verifique se a chave da API está configurada corretamente.');
      });

    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Erro ao inicializar o mapa.');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken]);

  useEffect(() => {
    if (!map.current || !mapLoaded || !data.length) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.state-marker');
    existingMarkers.forEach(marker => marker.remove());

    // State coordinates (approximate centers)
    const stateCoordinates: Record<string, [number, number]> = {
      'SP': [-46.6333, -23.5505],
      'RJ': [-43.1729, -22.9068],
      'MG': [-43.9378, -19.9167],
      'RS': [-51.2177, -30.0346],
      'PR': [-51.1694, -25.4244],
      'SC': [-48.5482, -27.2423],
      'GO': [-49.2532, -16.6869],
      'MT': [-55.6508, -15.6014],
      'MS': [-54.5854, -20.4486],
      'BA': [-41.7007, -12.9704],
      'PE': [-34.8788, -8.0476],
      'CE': [-38.5434, -3.7319],
      'PB': [-35.8809, -7.1195],
      'RN': [-35.2094, -5.7945],
      'AL': [-35.7353, -9.6658],
      'SE': [-37.0731, -10.9472],
      'PI': [-42.8034, -8.837],
      'MA': [-44.3068, -2.5297],
      'PA': [-52.9733, -5.4914],
      'AM': [-60.0261, -3.4168],
      'RR': [-60.6753, 1.8890],
      'AP': [-51.0694, 1.4148],
      'TO': [-48.2982, -10.1753],
      'AC': [-67.8243, -9.0238],
      'RO': [-63.5806, -11.2027],
      'ES': [-40.3080, -19.1834],
      'DF': [-47.8826, -15.7942]
    };

    const maxCount = Math.max(...data.map(d => d.count));

    data.forEach(({ state, count }) => {
      const abbreviation = stateAbbreviations[state] || state;
      const coordinates = stateCoordinates[abbreviation];
      
      if (coordinates && map.current) {
        // Calculate color intensity based on count
        const intensity = count / maxCount;
        const color = `hsl(var(--primary))`;
        const size = Math.max(20, Math.min(60, 20 + (intensity * 40)));

        // Create marker element
        const markerEl = document.createElement('div');
        markerEl.className = 'state-marker';
        markerEl.style.cssText = `
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: 2px solid hsl(var(--background));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: bold;
          color: white;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          opacity: ${0.7 + (intensity * 0.3)};
        `;
        markerEl.textContent = count.toString();

        // Create popup
        const popup = new mapboxgl.Popup({
          offset: 25,
          closeButton: false,
          closeOnClick: false
        }).setHTML(`
          <div style="padding: 8px;">
            <strong>${state}</strong><br>
            ${count} unidade${count !== 1 ? 's' : ''}
          </div>
        `);

        // Create marker
        const marker = new mapboxgl.Marker(markerEl)
          .setLngLat(coordinates)
          .setPopup(popup)
          .addTo(map.current);

        // Add hover events
        markerEl.addEventListener('mouseenter', () => {
          popup.addTo(map.current!);
        });
        markerEl.addEventListener('mouseleave', () => {
          popup.remove();
        });
      }
    });
  }, [data, mapLoaded]);

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Estado</CardTitle>
          <CardDescription>Mapa interativo das unidades por estado</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground mt-2">
            Para usar o mapa, adicione sua chave pública do Mapbox nas configurações do projeto.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição por Estado</CardTitle>
        <CardDescription>Unidades cadastradas por estado no Brasil</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div
            ref={mapContainer}
            className="w-full h-[400px] rounded-lg overflow-hidden"
            style={{ minHeight: '400px' }}
          />
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          )}
          {!isLoading && data.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </div>
        {data.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>Clique nos marcadores para ver detalhes</span>
            <span>{data.reduce((acc, curr) => acc + curr.count, 0)} unidades no total</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrazilMap;
