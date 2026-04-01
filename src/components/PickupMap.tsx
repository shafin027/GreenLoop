import React, { useEffect, useRef } from 'react';

interface Marker {
  lat: number;
  lng: number;
  label: string;
  color: 'green' | 'blue' | 'orange' | 'red';
  popup?: string;
}

interface PickupMapProps {
  markers?: Marker[];
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  mode?: 'view' | 'pick';
  onPick?: (lat: number, lng: number) => void;
  drawLine?: boolean;
  collectorLocation?: { lat: number; lng: number } | null;
}

const COLOR_MAP: Record<string, string> = {
  green: '#10b981',
  blue: '#3b82f6',
  orange: '#f59e0b',
  red: '#ef4444',
};

const LABEL_MAP: Record<string, string> = {
  green: '🏠',
  blue: '🚛',
  orange: '♻️',
  red: '📍',
};

export const PickupMap: React.FC<PickupMapProps> = ({
  markers = [],
  center,
  zoom = 13,
  className = 'w-full h-64 rounded-2xl overflow-hidden',
  mode = 'view',
  onPick,
  drawLine = false,
  collectorLocation,
}) => {
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pickMarkerRef = useRef<any>(null);
  const collectorMarkerRef = useRef<any>(null);
  const LRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    let map: any = null;

    import('leaflet').then((leafletModule) => {
      const L = leafletModule.default || leafletModule;
      LRef.current = L;

      if (!container) return;

      // Reset Leaflet's internal "already initialized" flag
      if ((container as any)._leaflet_id) {
        delete (container as any)._leaflet_id;
      }

      const defaultCenter = center || (markers.length > 0
        ? { lat: markers[0].lat, lng: markers[0].lng }
        : { lat: 23.8103, lng: 90.4125 });

      map = L.map(container, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom,
        zoomControl: true,
        attributionControl: false,
      });

      mapRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      markers.forEach((m) => {
        const icon = L.divIcon({
          html: `<div style="
            background:${COLOR_MAP[m.color]};
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            transform:rotate(-45deg);
            border:3px solid white;
            box-shadow:0 2px 8px rgba(0,0,0,0.4);
            display:flex;align-items:center;justify-content:center;
          "><span style="transform:rotate(45deg);font-size:14px;line-height:1;">${LABEL_MAP[m.color]}</span></div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -32],
        });
        const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
        const popupContent = m.popup || m.label;
        marker.bindPopup(`<div style="font-size:13px;font-weight:600;color:#111;">${popupContent}</div>`);
      });

      if (drawLine && markers.length >= 2) {
        const latlngs = markers.map((m) => [m.lat, m.lng] as [number, number]);
        L.polyline(latlngs, { color: '#10b981', weight: 3, dashArray: '8 4', opacity: 0.8 }).addTo(map);
      }

      // Add initial collector marker if available
      if (collectorLocation?.lat && collectorLocation?.lng) {
        const colIcon = makeCollectorIcon(L);
        collectorMarkerRef.current = L.marker([collectorLocation.lat, collectorLocation.lng], { icon: colIcon }).addTo(map);
        collectorMarkerRef.current.bindPopup(`<div style="font-size:13px;font-weight:600;color:#111;">🚛 Collector (Live)</div>`);
      }

      // Fit bounds to show all pins
      const allPoints = [
        ...markers.map((m) => [m.lat, m.lng] as [number, number]),
        ...(collectorLocation?.lat ? [[collectorLocation.lat, collectorLocation.lng] as [number, number]] : []),
      ];
      if (allPoints.length > 1) {
        const bounds = L.latLngBounds(allPoints);
        map.fitBounds(bounds, { padding: [30, 30] });
      }

      if (mode === 'pick') {
        const pickIcon = L.divIcon({
          html: `<div style="background:#ef4444;width:28px;height:28px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);"></div>`,
          className: '',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        map.on('click', (e: any) => {
          const { lat, lng } = e.latlng;
          if (pickMarkerRef.current) {
            pickMarkerRef.current.setLatLng([lat, lng]);
          } else {
            pickMarkerRef.current = L.marker([lat, lng], { icon: pickIcon, draggable: true }).addTo(map);
            pickMarkerRef.current.on('dragend', (ev: any) => {
              const pos = ev.target.getLatLng();
              onPick?.(pos.lat, pos.lng);
            });
          }
          onPick?.(lat, lng);
        });
      }
    });

    return () => {
      if (map) {
        map.remove();
        map = null;
      }
      mapRef.current = null;
      collectorMarkerRef.current = null;
      pickMarkerRef.current = null;
    };
  }, []);

  // Update collector marker in real-time without recreating the map
  useEffect(() => {
    const L = LRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!collectorLocation?.lat || !collectorLocation?.lng) {
      if (collectorMarkerRef.current) {
        collectorMarkerRef.current.remove();
        collectorMarkerRef.current = null;
      }
      return;
    }

    if (collectorMarkerRef.current) {
      collectorMarkerRef.current.setLatLng([collectorLocation.lat, collectorLocation.lng]);
    } else {
      const colIcon = makeCollectorIcon(L);
      collectorMarkerRef.current = L.marker([collectorLocation.lat, collectorLocation.lng], { icon: colIcon }).addTo(map);
      collectorMarkerRef.current.bindPopup(`<div style="font-size:13px;font-weight:600;color:#111;">🚛 Collector (Live)</div>`);
    }
  }, [collectorLocation?.lat, collectorLocation?.lng]);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    if (center) {
      map.setView([center.lat, center.lng], zoom);
    }
  }, [center?.lat, center?.lng]);

  return <div ref={containerRef} className={className} style={{ zIndex: 0 }} />;
};

function makeCollectorIcon(L: any) {
  return L.divIcon({
    html: `<div style="
      background:#3b82f6;
      width:36px;height:36px;border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 12px rgba(59,130,246,0.7);
      display:flex;align-items:center;justify-content:center;
      animation: pulse-blue 1.5s infinite;
    "><span style="font-size:16px;line-height:1;">🚛</span></div>
    <style>@keyframes pulse-blue{0%,100%{box-shadow:0 0 0 0 rgba(59,130,246,0.5)}50%{box-shadow:0 0 0 8px rgba(59,130,246,0)}}</style>`,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
}
