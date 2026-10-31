'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { DUSHANBE, type MapPin } from '../api';

// The pin is a plain amber dot (CSS class cb-pin), so Leaflet needs no marker images.
const pinIcon = L.divIcon({
  className: 'cb-pin',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -12],
});

const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (event) => onPick(event.latlng.lat, event.latlng.lng) });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [map, center]);
  return null;
}

/** The map where a person taps to put (or move) the pin of their slip. */
export function MapPickerInner({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (value: { lat: number; lng: number }) => void;
}) {
  return (
    <MapContainer
      center={value ? [value.lat, value.lng] : DUSHANBE}
      zoom={value ? 15 : 12}
      className="size-full"
      scrollWheelZoom={false}
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <ClickToPlace onPick={(lat, lng) => onChange({ lat, lng })} />
      {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
    </MapContainer>
  );
}

/** A small map with one pin (the post page). */
export function MapPinInner({ lat, lng }: { lat: number; lng: number }) {
  const center: [number, number] = [lat, lng];
  return (
    <MapContainer
      center={center}
      zoom={15}
      className="size-full"
      scrollWheelZoom={false}
      dragging={true}
    >
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      <Recenter center={center} />
      <Marker position={center} icon={pinIcon} />
    </MapContainer>
  );
}

/** Every slip with a pin, on one map. Tap a pin to see the slip and open it. */
export function BoardMapInner({
  pins,
  renderPopup,
}: {
  pins: MapPin[];
  renderPopup: (pin: MapPin) => React.ReactNode;
}) {
  return (
    <MapContainer center={DUSHANBE} zoom={12} className="size-full" scrollWheelZoom>
      <TileLayer url={TILES} attribution={ATTRIBUTION} />
      {pins.map((pin) => (
        <Marker key={pin.id} position={[pin.latitude, pin.longitude]} icon={pinIcon}>
          <Popup>{renderPopup(pin)}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
