

// import { useEffect, useMemo } from "react";
// import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
// import L from "leaflet";
// import icon2x from "leaflet/dist/images/marker-icon-2x.png";
// import icon from "leaflet/dist/images/marker-icon.png";
// import shadow from "leaflet/dist/images/marker-shadow.png";
// import "leaflet-rotatedmarker";

// L.Icon.Default.mergeOptions({
//   iconRetinaUrl: icon2x,
//   iconUrl: icon,
//   shadowUrl: shadow
// });

// function FitBounds({ allPositions }) {
//   const map = useMap();
//   useEffect(() => {
//     if (!allPositions?.length) return;
//     const bounds = L.latLngBounds(allPositions);
//     map.fitBounds(bounds, { padding: [24, 24] });
//   }, [allPositions, map]);
//   return null;
// }

// // Distance in meters
// function distanceM(a, b) {
//   const toRad = d => (d * Math.PI) / 180;
//   const R = 6371000;
//   const dLat = toRad(b.latitude - a.latitude);
//   const dLon = toRad(b.longitude - a.longitude);
//   const lat1 = toRad(a.latitude);
//   const lat2 = toRad(b.latitude);
//   const x =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
//   return 2 * R * Math.asin(Math.sqrt(x));
// }

// export default function MapView({ vehicles }) {
//   // vehicles = [{ id, route, currentIndex }, ...]

//   const allPositions = useMemo(() => {
//     return vehicles.flatMap(v => v.route.map(p => [p.latitude, p.longitude]));
//   }, [vehicles]);

//   return (
//     <MapContainer className="mapWrap" center={[0, 0]} zoom={15} scrollWheelZoom>
//       <TileLayer
//         attribution='&copy; OpenStreetMap contributors'
//         url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//       />
//       <FitBounds allPositions={allPositions} />

//       {vehicles.map(vehicle => {
//         const positions = vehicle.route.map(p => [p.latitude, p.longitude]);
//         const currentPos = positions[vehicle.currentIndex] || positions[0];
//         const prevPos = vehicle.route[vehicle.currentIndex - 1];

//         let speedKmh = null;
//         let elapsed = null;

//         if (vehicle.currentIndex > 0 && prevPos?.timestamp && vehicle.route[vehicle.currentIndex]?.timestamp) {
//           const dt = (new Date(vehicle.route[vehicle.currentIndex].timestamp) - new Date(prevPos.timestamp)) / 1000;
//           if (dt > 0) {
//             const dist = distanceM(prevPos, vehicle.route[vehicle.currentIndex]);
//             speedKmh = (dist / dt) * 3.6;
//           }
//         }

//         if (vehicle.route[0]?.timestamp && vehicle.route[vehicle.currentIndex]?.timestamp) {
//           elapsed = (new Date(vehicle.route[vehicle.currentIndex].timestamp) - new Date(vehicle.route[0].timestamp)) / 1000;
//         }

//         return (
//           <div key={vehicle.id}>
//             {/* Draw the route polyline */}
//             {positions.length > 0 && <Polyline positions={positions.slice(0, vehicle.currentIndex + 1)} />}

//             {/* Vehicle marker */}
//             {currentPos && (
//               <Marker position={currentPos}>
//                 <Popup>
//                   <strong>Vehicle {vehicle.id}</strong><br />
//                   Position: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}<br />
//                   {elapsed !== null && <>Elapsed: {Math.floor(elapsed)}s<br /></>}
//                   {speedKmh !== null && <>Speed: {speedKmh.toFixed(1)} km/h<br /></>}
//                   Point: {vehicle.currentIndex + 1}/{vehicle.route.length}
//                 </Popup>
//               </Marker>
//             )}
//           </div>
//         );
//       })}
//     </MapContainer>
//   );
// }
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-rotatedmarker";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import icon from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";
import "leaflet/dist/leaflet.css";

// Default Leaflet icon fix
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: shadow
});

// Custom vehicle icons
const carIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/743/743922.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const busIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61212.png",
  iconSize: [36, 36],
  iconAnchor: [18, 18]
});

function FitBounds({ allPositions }) {
  const map = useMap();
  useEffect(() => {
    if (!allPositions?.length) return;
    const bounds = L.latLngBounds(allPositions);
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [allPositions, map]);
  return null;
}

// Distance in meters
function distanceM(a, b) {
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
}

export default function MapView({ vehicles }) {
  const allPositions = useMemo(
    () => vehicles.flatMap(v => v.route.map(p => [p.latitude, p.longitude])),
    [vehicles]
  );

  return (
    <MapContainer className="mapWrap" center={[0, 0]} zoom={15} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds allPositions={allPositions} />

      {vehicles.map((vehicle, index) => {
        const positions = vehicle.route.map(p => [p.latitude, p.longitude]);
        const currentPos = positions[vehicle.currentIndex] || positions[0];
        const prevPos = vehicle.route[vehicle.currentIndex - 1];

        let speedKmh = null;
        let elapsed = null;

        if (vehicle.currentIndex > 0 && prevPos?.timestamp && vehicle.route[vehicle.currentIndex]?.timestamp) {
          const dt = (new Date(vehicle.route[vehicle.currentIndex].timestamp) - new Date(prevPos.timestamp)) / 1000;
          if (dt > 0) {
            const dist = distanceM(prevPos, vehicle.route[vehicle.currentIndex]);
            speedKmh = (dist / dt) * 3.6;
          }
        }

        if (vehicle.route[0]?.timestamp && vehicle.route[vehicle.currentIndex]?.timestamp) {
          elapsed = (new Date(vehicle.route[vehicle.currentIndex].timestamp) - new Date(vehicle.route[0].timestamp)) / 1000;
        }

        return (
          <div key={vehicle.id}>
            {/* Polyline with different colors */}
            {positions.length > 0 && (
              <Polyline
                positions={positions.slice(0, vehicle.currentIndex + 1)}
                pathOptions={{
                  color: index === 0 ? "blue" : "orange",
                  weight: 4,
                  opacity: 0.7
                }}
              />
            )}

            {/* Marker with custom icon */}
            {currentPos && (
              <Marker
                position={currentPos}
                icon={index === 0 ? carIcon : busIcon}
              >
                <Popup>
                  <strong>{index === 0 ? "Car" : "Bus"} #{vehicle.id}</strong><br />
                  Position: {currentPos[0].toFixed(5)}, {currentPos[1].toFixed(5)}<br />
                  {elapsed !== null && <>Elapsed: {Math.floor(elapsed)}s<br /></>}
                  {speedKmh !== null && <>Speed: {speedKmh.toFixed(1)} km/h<br /></>}
                  Point: {vehicle.currentIndex + 1}/{vehicle.route.length}
                </Popup>
              </Marker>
            )}
          </div>
        );
      })}
    </MapContainer>
  );
}
