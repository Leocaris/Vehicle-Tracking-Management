


import { useEffect, useRef, useState, useCallback } from "react";

// Google Maps component
function GoogleMapView({ vehicles, apiKey }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polylinesRef = useRef([]);
  const timestampMarkersRef = useRef([]);
  const staticElementsInitialized = useRef(false);

  // Distance calculation in meters
  const distanceM = useCallback((a, b) => {
    const toRad = d => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    const initMap = () => {
      if (!window.google || !mapRef.current) return;

      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 17.385044, lng: 78.486671 },
        zoom: 13,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_BOTTOM
        },
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'simplified' }]
          },
          {
            featureType: 'road',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      mapInstanceRef.current = map;
    };

    if (window.google && window.google.maps) {
      initMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = initMap;
      document.head.appendChild(script);

      return () => {
        if (document.head.contains(script)) {
          document.head.removeChild(script);
        }
      };
    }
  }, [apiKey]);

  // Initialize static elements (full routes) only once
  useEffect(() => {
    if (!mapInstanceRef.current || !vehicles.length || !window.google || staticElementsInitialized.current) return;
    
    vehicles.forEach((vehicle, vehicleIndex) => {
      const { route } = vehicle;
      
      // Full route in light gray (static)
      const fullRoutePath = route.map(point => ({
        lat: point.latitude,
        lng: point.longitude
      }));

      if (fullRoutePath.length > 1) {
        const fullRoutePolyline = new window.google.maps.Polyline({
          path: fullRoutePath,
          geodesic: true,
          strokeColor: '#E0E0E0',
          strokeOpacity: 0.6,
          strokeWeight: 3,
        });
        fullRoutePolyline.setMap(mapInstanceRef.current);
        polylinesRef.current.push(fullRoutePolyline);
      }
    });

    // Fit bounds only once at initialization
    const bounds = new window.google.maps.LatLngBounds();
    vehicles.forEach(vehicle => {
      vehicle.route.forEach(point => {
        bounds.extend({ lat: point.latitude, lng: point.longitude });
      });
    });
    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds);
    }

    staticElementsInitialized.current = true;
  }, [vehicles.length]);

  // Update vehicle positions, traveled paths, and progressive timestamps
  useEffect(() => {
    if (!mapInstanceRef.current || !vehicles.length || !window.google) return;

    // Update vehicle markers smoothly (reuse existing markers when possible)
    vehicles.forEach((vehicle, vehicleIndex) => {
      const { route, currentIndex, isCompleted } = vehicle;
      const currentPos = route[currentIndex];

      // Update or create vehicle marker
      if (currentPos && !isCompleted) {
        let marker = markersRef.current[vehicleIndex];
        
        // Calculate bearing for vehicle direction
        let bearing = 0;
        if (currentIndex > 0 && route[currentIndex - 1]) {
          const prev = route[currentIndex - 1];
          const curr = currentPos;
          bearing = google.maps.geometry.spherical.computeHeading(
            new google.maps.LatLng(prev.latitude, prev.longitude),
            new google.maps.LatLng(curr.latitude, curr.longitude)
          );
        }

        const vehicleIcon = {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
              <g transform="rotate(${bearing} 20 20)">
                <circle cx="20" cy="20" r="18" fill="${vehicleIndex === 0 ? '#4285F4' : '#FF6D01'}" stroke="white" stroke-width="3"/>
                <polygon points="20,8 26,16 14,16" fill="white"/>
                <text x="20" y="28" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="white">
                  ${vehicleIndex === 0 ? '🚗' : '🚌'}
                </text>
              </g>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        };

        if (marker) {
          // Smooth position update
          const newPos = new google.maps.LatLng(currentPos.latitude, currentPos.longitude);
          marker.setPosition(newPos);
          marker.setIcon(vehicleIcon);
        } else {
          // Create new marker
          marker = new window.google.maps.Marker({
            position: { lat: currentPos.latitude, lng: currentPos.longitude },
            map: mapInstanceRef.current,
            icon: vehicleIcon,
            zIndex: 1000 + vehicleIndex,
          });
          markersRef.current[vehicleIndex] = marker;
        }
      } else if (markersRef.current[vehicleIndex]) {
        // Remove completed vehicle marker
        markersRef.current[vehicleIndex].setMap(null);
        markersRef.current[vehicleIndex] = null;
      }
    });

    // Update traveled paths and timestamps less frequently to reduce blinking
    const updatePaths = () => {
      // Clear existing traveled polylines
      const dynamicPolylines = polylinesRef.current.slice(vehicles.length);
      dynamicPolylines.forEach(polyline => polyline.setMap(null));
      polylinesRef.current = polylinesRef.current.slice(0, vehicles.length);

      vehicles.forEach((vehicle, vehicleIndex) => {
        const { route, currentIndex } = vehicle;
        
        // Create traveled path polyline (only up to current position)
        const traveledPath = route.slice(0, currentIndex + 1).map(point => ({
          lat: point.latitude,
          lng: point.longitude
        }));

        if (traveledPath.length > 1) {
          const traveledPolyline = new window.google.maps.Polyline({
            path: traveledPath,
            geodesic: true,
            strokeColor: vehicleIndex === 0 ? '#4285F4' : '#FF6D01',
            strokeOpacity: 1,
            strokeWeight: 4,
          });
          traveledPolyline.setMap(mapInstanceRef.current);
          polylinesRef.current.push(traveledPolyline);
        }
      });
    };

    // Update timestamps less frequently and only when needed
    const updateTimestamps = () => {
      // Only update timestamps every 5 steps to reduce blinking
      const shouldUpdate = vehicles.some(v => v.currentIndex % 5 === 0);
      if (!shouldUpdate) return;

      // Clear existing timestamp markers
      timestampMarkersRef.current.forEach(marker => marker.setMap(null));
      timestampMarkersRef.current = [];

      vehicles.forEach((vehicle, vehicleIndex) => {
        const { route, currentIndex } = vehicle;
        
        // Add timestamp markers for traveled portion only (every 15 points)
        for (let i = 15; i <= currentIndex; i += 15) {
          const point = route[i];
          if (point && point.timestamp) {
            const time = new Date(point.timestamp).toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            });
            
            const timestampMarker = new window.google.maps.Marker({
              position: { lat: point.latitude, lng: point.longitude },
              map: mapInstanceRef.current,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                  <svg width="60" height="20" xmlns="http://www.w3.org/2000/svg">
                    <rect x="0" y="0" width="60" height="20" rx="10" fill="rgba(255,255,255,0.95)" stroke="#666" stroke-width="1"/>
                    <text x="30" y="14" text-anchor="middle" font-family="Arial" font-size="10" fill="#333">${time}</text>
                  </svg>
                `),
                scaledSize: new window.google.maps.Size(60, 20),
                anchor: new window.google.maps.Point(30, 10),
              },
              zIndex: 50
            });
            timestampMarkersRef.current.push(timestampMarker);
          }
        }
      });
    };

    // Update paths and timestamps with throttling
    updatePaths();
    updateTimestamps();

  }, [vehicles]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        borderRadius: '12px',
        overflow: 'hidden'
      }} 
    />
  );
}

// Fleet Stats Header
function FleetStats({ vehicles }) {
  const onTrip = vehicles.filter(v => !v.isCompleted).length;
  const completed = vehicles.filter(v => v.isCompleted).length;
  const parked = vehicles.length - onTrip;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '16px',
      marginBottom: '24px'
    }}>
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '1px solid #E8EAED'
      }}>
        <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '8px' }}>All Vehicles</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#202124' }}>{vehicles.length}</div>
      </div>
      
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '2px solid #4285F4',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }}>
        <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '8px' }}>On Trip</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4285F4' }}>{onTrip}</div>
      </div>
      
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '1px solid #E8EAED'
      }}>
        <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '8px' }}>Completed</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#34A853' }}>{completed}</div>
      </div>
      
      <div style={{
        background: 'white',
        padding: '20px',
        borderRadius: '12px',
        textAlign: 'center',
        border: '1px solid #E8EAED'
      }}>
        <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '8px' }}>Parked</div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#202124' }}>{parked}</div>
      </div>
    </div>
  );
}

// Vehicle List Item
function VehicleListItem({ vehicle, index, distanceM, onSelect, isSelected }) {
  const vehicleType = index === 0 ? 'Car' : 'Bus';
  const currentPos = vehicle.route[vehicle.currentIndex];
  const prevPos = vehicle.route[vehicle.currentIndex - 1];
  
  let speedKmh = 0;
  let elapsed = 0;

  if (vehicle.currentIndex > 0 && prevPos?.timestamp && currentPos?.timestamp) {
    const dt = (new Date(currentPos.timestamp) - new Date(prevPos.timestamp)) / 1000;
    if (dt > 0) {
      const dist = distanceM(prevPos, currentPos);
      speedKmh = (dist / dt) * 3.6;
    }
  }

  if (vehicle.route[0]?.timestamp && currentPos?.timestamp) {
    elapsed = (new Date(currentPos.timestamp) - new Date(vehicle.route[0].timestamp)) / 1000;
  }

  const progress = ((vehicle.currentIndex + 1) / vehicle.route.length) * 100;
  const status = vehicle.isCompleted ? 'Completed' : speedKmh > 5 ? 'Moving' : 'Stationary';
  
  return (
    <div 
      onClick={onSelect}
      style={{
        background: 'white',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '12px',
        border: isSelected ? `2px solid ${index === 0 ? '#4285F4' : '#FF6D01'}` : '1px solid #E8EAED',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${index === 0 ? '#4285F4' : '#FF6D01'}, ${index === 0 ? '#1A73E8' : '#E8710A'})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '20px',
          marginRight: '12px'
        }}>
          {vehicleType === 'Car' ? '🚗' : '🚌'}
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#202124', marginBottom: '4px' }}>
            {vehicleType} #{vehicle.id}
          </div>
          <div style={{ fontSize: '14px', color: '#5F6368' }}>
            {currentPos ? `${currentPos.latitude.toFixed(4)}, ${currentPos.longitude.toFixed(4)}` : 'No location'}
          </div>
        </div>
        
        <div style={{
          background: status === 'Moving' ? '#E8F5E8' : status === 'Completed' ? '#E3F2FD' : '#FFF3E0',
          color: status === 'Moving' ? '#137333' : status === 'Completed' ? '#1565C0' : '#E37400',
          padding: '4px 12px',
          borderRadius: '16px',
          fontSize: '12px',
          fontWeight: '500'
        }}>
          {status}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '12px' }}>
        <div>
          <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '4px' }}>Speed</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#202124' }}>
            {speedKmh.toFixed(1)} km/h
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '4px' }}>Time</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#202124' }}>
            {Math.floor(elapsed / 60)}:{(elapsed % 60).toFixed(0).padStart(2, '0')}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: '#5F6368', marginBottom: '4px' }}>Progress</div>
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#202124' }}>
            {progress.toFixed(0)}%
          </div>
        </div>
      </div>
      
      <div style={{
        background: '#F1F3F4',
        height: '4px',
        borderRadius: '2px',
        overflow: 'hidden'
      }}>
        <div style={{
          background: `linear-gradient(90deg, ${index === 0 ? '#4285F4' : '#FF6D01'}, ${index === 0 ? '#1A73E8' : '#E8710A'})`,
          height: '100%',
          width: `${progress}%`,
          transition: 'width 0.3s ease'
        }} />
      </div>
    </div>
  );
}

// Fetch road-snapped route from OSRM with more points for smoother movement
async function getRoadRoute(points) {
  const coordStr = points.map(p => `${p.longitude},${p.latitude}`).join(";");
  const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.routes || !data.routes.length) throw new Error("No route found");
  
  // Get the route coordinates and create more interpolated points for smoother movement
  const coords = data.routes[0].geometry.coordinates;
  const interpolatedRoute = [];
  
  for (let i = 0; i < coords.length; i++) {
    const [lng, lat] = coords[i];
    interpolatedRoute.push({
      latitude: lat,
      longitude: lng,
      timestamp: new Date(Date.now() + interpolatedRoute.length * 1000).toISOString() // 1s apart
    });
    
    // Add interpolated points between route points for smoother movement
    if (i < coords.length - 1) {
      const [nextLng, nextLat] = coords[i + 1];
      // Add 2 interpolated points between each route point
      for (let j = 1; j <= 2; j++) {
        const ratio = j / 3;
        interpolatedRoute.push({
          latitude: lat + (nextLat - lat) * ratio,
          longitude: lng + (nextLng - lng) * ratio,
          timestamp: new Date(Date.now() + interpolatedRoute.length * 1000).toISOString()
        });
      }
    }
  }
  
  return interpolatedRoute;
}

export default function App() {
  const [vehicles, setVehicles] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const tickRef = useRef(null);
  const TICK_MS = 500; // Slower for smoother movement
  const API_KEY = "AIzaSyBQNb4GQ7Ibbwzpps829YkSOhNDWtE7gO0";

  // Distance calculation for stats
  const distanceM = useCallback((a, b) => {
    const toRad = d => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }, []);

  useEffect(() => {
    async function loadRoutes() {
      const rawRoutes = [
        { 
          id: 1, 
          rawPoints: [
            { latitude: 17.385044, longitude: 78.486671 },
            { latitude: 17.390044, longitude: 78.490671 },
            { latitude: 17.395044, longitude: 78.495671 },
            { latitude: 17.400044, longitude: 78.500671 },
          ] 
        },
        { 
          id: 2, 
          rawPoints: [
            { latitude: 17.387244, longitude: 78.488871 },
            { latitude: 17.382244, longitude: 78.483871 },
            { latitude: 17.377244, longitude: 78.478871 },
            { latitude: 17.372244, longitude: 78.473871 },
          ] 
        }
      ];
      
      const loadedVehicles = [];
      for (let v of rawRoutes) {
        try {
          const snapped = await getRoadRoute(v.rawPoints);
          loadedVehicles.push({
            id: v.id,
            route: snapped,
            currentIndex: 0,
            isCompleted: false
          });
        } catch (error) {
          console.error(`Failed to load route for vehicle ${v.id}:`, error);
        }
      }
      setVehicles(loadedVehicles);
    }
    loadRoutes();
  }, []);

  useEffect(() => {
    if (!playing || vehicles.length === 0) return;
    const ms = Math.max(100, TICK_MS / speedMultiplier);
    tickRef.current = setInterval(() => {
      setVehicles(prevVehicles =>
        prevVehicles.map(v => {
          if (v.isCompleted) return v;
          const nextIndex = v.currentIndex + 1;
          if (nextIndex >= v.route.length) {
            return { ...v, isCompleted: true };
          }
          return { ...v, currentIndex: nextIndex };
        })
      );
    }, ms);
    return () => clearInterval(tickRef.current);
  }, [playing, speedMultiplier, vehicles.length]);

  function reset() {
    clearInterval(tickRef.current);
    setVehicles(vs => vs.map(v => ({ ...v, currentIndex: 0, isCompleted: false })));
    setPlaying(false);
  }

  return (
    <div style={{ 
      fontFamily: 'Google Sans, Roboto, Arial, sans-serif',
      background: '#F8F9FA',
      minHeight: '100vh',
      padding: '24px'
    }}>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: '500',
        marginBottom: '24px',
        color: '#202124'
      }}>
        Fleet Management Dashboard
      </div>
      
      <FleetStats vehicles={vehicles} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', height: 'calc(100vh - 200px)' }}>
        {/* Left Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Controls */}
          <div style={{
            background: 'white',
            padding: '20px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid #E8EAED'
          }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <button 
                onClick={() => setPlaying(p => !p)} 
                disabled={!vehicles.length}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  background: playing ? '#EA4335' : '#4285F4',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: vehicles.length ? 'pointer' : 'not-allowed',
                  opacity: vehicles.length ? 1 : 0.5,
                  fontWeight: '500'
                }}
              >
                {playing ? "Pause" : "Start Trip"}
              </button>
              
              <button 
                onClick={reset} 
                disabled={!vehicles.length}
                style={{
                  flex: 1,
                  padding: '12px',
                  fontSize: '14px',
                  background: 'white',
                  color: '#5F6368',
                  border: '1px solid #DADCE0',
                  borderRadius: '8px',
                  cursor: vehicles.length ? 'pointer' : 'not-allowed',
                  opacity: vehicles.length ? 1 : 0.5,
                  fontWeight: '500'
                }}
              >
                Reset
              </button>
            </div>
            
            <div>
              <label style={{ fontSize: '14px', color: '#5F6368', marginBottom: '8px', display: 'block' }}>
                Playback Speed
              </label>
              <select
                value={speedMultiplier}
                onChange={e => setSpeedMultiplier(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid #DADCE0',
                  background: 'white'
                }}
              >
                <option value={0.5}>0.5x (Slow)</option>
                <option value={1}>1x (Normal)</option>
                <option value={2}>2x (Fast)</option>
                <option value={4}>4x (Very Fast)</option>
              </select>
            </div>
          </div>
          
          {/* Vehicle List */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '16px', fontWeight: '500', color: '#202124', marginBottom: '12px' }}>
              Active Vehicles ({vehicles.length})
            </div>
            {vehicles.map((vehicle, index) => (
              <VehicleListItem 
                key={vehicle.id} 
                vehicle={vehicle} 
                index={index} 
                distanceM={distanceM}
                isSelected={selectedVehicle === vehicle.id}
                onSelect={() => setSelectedVehicle(vehicle.id)}
              />
            ))}
          </div>
        </div>
        
        {/* Map */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid #E8EAED'
        }}>
          <GoogleMapView vehicles={vehicles} apiKey={API_KEY} />
        </div>
      </div>
    </div>
  );
}


