import { useEffect, useRef } from 'react';
import type { Route } from '@/backend';

interface MapPosition {
  lat: number;
  lon: number;
}

interface MapContainerProps {
  positions: MapPosition[];
  currentPosition?: MapPosition | null;
  showPath?: boolean;
  route?: Route | null;
  showRouteOnly?: boolean; // New prop to show only route points without tracking data
}

export function MapContainer({ positions, currentPosition, showPath = true, route, showRouteOnly = false }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const pathRef = useRef<any>(null);
  const routeLinesRef = useRef<any[]>([]);
  const isInitializedRef = useRef(false);

  // Clear all map elements
  const clearMapElements = () => {
    if (!mapInstanceRef.current) return;
    
    const map = mapInstanceRef.current;
    
    // Clear existing markers, paths, and route lines
    markersRef.current.forEach(marker => {
      try {
        map.removeLayer(marker);
      } catch (e) {
        // Ignore errors when removing layers
      }
    });
    markersRef.current = [];
    
    if (pathRef.current) {
      try {
        map.removeLayer(pathRef.current);
      } catch (e) {
        // Ignore errors when removing layers
      }
      pathRef.current = null;
    }
    
    routeLinesRef.current.forEach(line => {
      try {
        map.removeLayer(line);
      } catch (e) {
        // Ignore errors when removing layers
      }
    });
    routeLinesRef.current = [];
  };

  // Add route visualization to map
  const addRouteToMap = (L: any, map: any) => {
    if (!route) return;

    // Start line (green)
    const startLine = L.polyline([
      [route.startPoint1.lat, route.startPoint1.lon],
      [route.startPoint2.lat, route.startPoint2.lon]
    ], {
      color: '#22c55e', // Green color
      weight: 4,
      opacity: 0.8,
    }).addTo(map);
    routeLinesRef.current.push(startLine);

    // Intermediate line (red)
    const intermediateLine = L.polyline([
      [route.intermediatePoint1.lat, route.intermediatePoint1.lon],
      [route.intermediatePoint2.lat, route.intermediatePoint2.lon]
    ], {
      color: '#ef4444', // Red color
      weight: 4,
      opacity: 0.8,
    }).addTo(map);
    routeLinesRef.current.push(intermediateLine);

    // Create numbered and colored route point markers
    // Point 1 (Start line - Green)
    const point1Icon = L.divIcon({
      className: 'custom-marker route-point-marker',
      html: '<div class="marker-inner route-point-green"><span class="point-number">1</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const point1Marker = L.marker([route.startPoint1.lat, route.startPoint1.lon], { 
      icon: point1Icon,
      title: 'Linea di partenza - Punto 1',
    }).addTo(map);
    markersRef.current.push(point1Marker);

    // Point 2 (Start line - Green)
    const point2Icon = L.divIcon({
      className: 'custom-marker route-point-marker',
      html: '<div class="marker-inner route-point-green"><span class="point-number">2</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const point2Marker = L.marker([route.startPoint2.lat, route.startPoint2.lon], { 
      icon: point2Icon,
      title: 'Linea di partenza - Punto 2',
    }).addTo(map);
    markersRef.current.push(point2Marker);

    // Point 3 (Intermediate line - Red)
    const point3Icon = L.divIcon({
      className: 'custom-marker route-point-marker',
      html: '<div class="marker-inner route-point-red"><span class="point-number">3</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const point3Marker = L.marker([route.intermediatePoint1.lat, route.intermediatePoint1.lon], { 
      icon: point3Icon,
      title: 'Linea intermedia - Punto 3',
    }).addTo(map);
    markersRef.current.push(point3Marker);

    // Point 4 (Intermediate line - Red)
    const point4Icon = L.divIcon({
      className: 'custom-marker route-point-marker',
      html: '<div class="marker-inner route-point-red"><span class="point-number">4</span></div>',
      iconSize: [34, 34],
      iconAnchor: [17, 17],
    });

    const point4Marker = L.marker([route.intermediatePoint2.lat, route.intermediatePoint2.lon], { 
      icon: point4Icon,
      title: 'Linea intermedia - Punto 4',
    }).addTo(map);
    markersRef.current.push(point4Marker);
  };

  // Add tracking visualization to map
  const addTrackingToMap = (L: any, map: any) => {
    if (showRouteOnly) return;

    const allPositions = [...positions];
    if (currentPosition && !positions.some(p => p.lat === currentPosition.lat && p.lon === currentPosition.lon)) {
      allPositions.push(currentPosition);
    }

    if (allPositions.length === 0) return;

    // Create custom icons for tracking
    const startIcon = L.divIcon({
      className: 'custom-marker start-marker',
      html: '<div class="marker-inner start"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const endIcon = L.divIcon({
      className: 'custom-marker end-marker',
      html: '<div class="marker-inner end"></div>',
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    const currentIcon = L.divIcon({
      className: 'custom-marker current-marker',
      html: '<div class="marker-inner current"></div>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    });

    const regularIcon = L.divIcon({
      className: 'custom-marker regular-marker',
      html: '<div class="marker-inner regular"></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    // Add path if requested and we have multiple positions
    if (showPath && positions.length > 1) {
      const pathCoords = positions.map(pos => [pos.lat, pos.lon] as [number, number]);
      pathRef.current = L.polyline(pathCoords, {
        color: 'oklch(var(--primary))',
        weight: 4,
        opacity: 0.8,
        smoothFactor: 1,
      }).addTo(map);
    }

    // Add position markers
    positions.forEach((pos, index) => {
      let icon = regularIcon;
      let title = `Punto ${index + 1}`;
      
      if (index === 0) {
        icon = startIcon;
        title = 'Punto di partenza';
      } else if (index === positions.length - 1) {
        icon = endIcon;
        title = 'Punto di arrivo';
      }

      const marker = L.marker([pos.lat, pos.lon], { 
        icon,
        title,
      }).addTo(map);
      
      markersRef.current.push(marker);
    });

    // Add current position marker if different from last position
    if (currentPosition && (!positions.length || 
        (positions[positions.length - 1].lat !== currentPosition.lat || 
         positions[positions.length - 1].lon !== currentPosition.lon))) {
      const marker = L.marker([currentPosition.lat, currentPosition.lon], { 
        icon: currentIcon,
        title: 'Posizione attuale',
      }).addTo(map);
      
      markersRef.current.push(marker);
    }
  };

  // Update map view and fit bounds
  const updateMapBounds = (L: any, map: any) => {
    const allPositions = showRouteOnly ? [] : [...positions];
    if (currentPosition && !showRouteOnly && !positions.some(p => p.lat === currentPosition.lat && p.lon === currentPosition.lon)) {
      allPositions.push(currentPosition);
    }

    // Auto-fit bounds to show all positions and route
    const boundsPoints = [...allPositions.map(pos => [pos.lat, pos.lon])];
    if (route) {
      boundsPoints.push(
        [route.startPoint1.lat, route.startPoint1.lon],
        [route.startPoint2.lat, route.startPoint2.lon],
        [route.intermediatePoint1.lat, route.intermediatePoint1.lon],
        [route.intermediatePoint2.lat, route.intermediatePoint2.lon]
      );
    }

    if (boundsPoints.length === 1) {
      map.setView([boundsPoints[0][0], boundsPoints[0][1]], 16);
    } else if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 18,
      });
    }
  };

  // Update map content
  const updateMapContent = () => {
    if (!mapInstanceRef.current || !(window as any).L) return;

    const L = (window as any).L;
    const map = mapInstanceRef.current;

    // Clear existing content
    clearMapElements();

    // Add route visualization first (so it appears behind tracking markers)
    addRouteToMap(L, map);

    // Add tracking visualization
    addTrackingToMap(L, map);

    // Update bounds to show all content
    updateMapBounds(L, map);
  };

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || isInitializedRef.current) return;

    // Load Leaflet CSS and JS if not already loaded
    const loadLeaflet = async () => {
      if (typeof window !== 'undefined' && !(window as any).L) {
        // Load CSS
        const cssLink = document.createElement('link');
        cssLink.rel = 'stylesheet';
        cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        cssLink.crossOrigin = '';
        document.head.appendChild(cssLink);

        // Load JS
        return new Promise<void>((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
          script.crossOrigin = '';
          script.onload = () => resolve();
          document.head.appendChild(script);
        });
      }
    };

    const initMap = async () => {
      try {
        await loadLeaflet();
        
        if (!mapRef.current || mapInstanceRef.current) return;

        const L = (window as any).L;
        
        // Initialize map
        const map = L.map(mapRef.current, {
          zoomControl: true,
          attributionControl: true,
        });

        mapInstanceRef.current = map;
        isInitializedRef.current = true;

        // Add satellite tile layer (Esri World Imagery)
        const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics',
          maxZoom: 19,
        });

        // Add OpenStreetMap as fallback
        const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{y}/{x}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });

        // Always use satellite layer by default, especially for route viewing
        satelliteLayer.addTo(map);

        // Add layer control to switch between satellite and street view (only if not showing route only)
        if (!showRouteOnly) {
          const baseMaps = {
            "Vista Satellitare": satelliteLayer,
            "Mappa Stradale": osmLayer
          };
          L.control.layers(baseMaps).addTo(map);
        }

        // Set initial view
        if (positions.length > 0) {
          const center = positions[Math.floor(positions.length / 2)];
          map.setView([center.lat, center.lon], 15);
        } else if (currentPosition) {
          map.setView([currentPosition.lat, currentPosition.lon], 15);
        } else if (route) {
          // Center on route if no positions
          const routeCenter = {
            lat: (route.startPoint1.lat + route.startPoint2.lat + route.intermediatePoint1.lat + route.intermediatePoint2.lat) / 4,
            lon: (route.startPoint1.lon + route.startPoint2.lon + route.intermediatePoint1.lon + route.intermediatePoint2.lon) / 4
          };
          map.setView([routeCenter.lat, routeCenter.lon], 15);
        } else {
          // Default to Italy center
          map.setView([41.9028, 12.4964], 6);
        }

        // Wait a bit for the map to be fully ready, then update content
        setTimeout(() => {
          updateMapContent();
        }, 100);

      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        try {
          clearMapElements();
          mapInstanceRef.current.remove();
        } catch (e) {
          // Ignore cleanup errors
        }
        mapInstanceRef.current = null;
        isInitializedRef.current = false;
      }
      markersRef.current = [];
      pathRef.current = null;
      routeLinesRef.current = [];
    };
  }, []); // Only run once on mount

  // Update map content when props change
  useEffect(() => {
    if (isInitializedRef.current && mapInstanceRef.current) {
      // Small delay to ensure the map is ready for updates
      const timeoutId = setTimeout(() => {
        updateMapContent();
      }, 50);

      return () => clearTimeout(timeoutId);
    }
  }, [positions, currentPosition, showPath, route, showRouteOnly]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full bg-muted rounded-lg"
      style={{ minHeight: '200px' }}
    />
  );
}
