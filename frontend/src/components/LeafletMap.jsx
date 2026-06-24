import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix leaflet icon assets loading issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to center map on new lead markers dynamically
function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

const createCustomIcon = (classification, isBooked) => {
  let html = '';
  let className = '';
  
  if (isBooked) {
    html = `<div class="pulse-marker"><div class="pulse-ring-blue"></div><span style="font-size: 18px; filter: drop-shadow(0 0 5px #10b981);">📅</span></div>`;
    className = 'booked-marker';
  } else if (classification === 'high_value') {
    html = `<div class="pulse-marker"><div class="pulse-ring-gold"></div><span style="font-size: 22px; filter: drop-shadow(0 0 5px #ffd700);">⭐</span></div>`;
    className = 'high-value-marker';
  } else if (classification === 'valid') {
    html = `<div class="pulse-marker"><div class="pulse-ring-blue"></div><span style="font-size: 14px; filter: drop-shadow(0 0 5px #00d4ff);">🔵</span></div>`;
    className = 'valid-marker';
  } else if (classification === 'spam') {
    html = `<span style="font-size: 16px; opacity: 0.6;">❌</span>`;
    className = 'spam-marker';
  } else if (classification === 'incomplete') {
    html = `<span style="font-size: 16px;">❓</span>`;
    className = 'incomplete-marker';
  } else {
    html = `<span style="font-size: 12px; opacity: 0.7;">⚫</span>`;
    className = 'neutral-marker';
  }
  
  return L.divIcon({
    html: html,
    className: `custom-leaflet-icon ${className}`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

export default function LeafletMap({ leads, onMarkerClick }) {
  // Find first lead with valid lat/lng to center map
  const validLeads = (leads || []).filter(l => l.lat !== undefined && l.lng !== undefined && l.lat !== null && l.lng !== null);
  
  const defaultCenter = [37.0902, -95.7129]; // US Center
  const center = validLeads.length > 0 ? [validLeads[0].lat, validLeads[0].lng] : defaultCenter;
  const zoom = validLeads.length > 0 ? 4 : 2;

  return (
    <div className="map-container relative h-full w-full">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#050811' }}
      >
        <ChangeView center={center} zoom={zoom} />
        
        {/* Premium Dark Theme Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        
        {validLeads.map(lead => {
          const isBooked = lead.meeting_time !== null && lead.meeting_time !== undefined;
          const icon = createCustomIcon(lead.classification, isBooked);
          
          return (
            <Marker
              key={lead.lead_id}
              position={[lead.lat, lead.lng]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) onMarkerClick(lead);
                },
              }}
            >
              <Popup>
                <div style={{ color: '#000', fontSize: '12px' }}>
                  <strong>{lead.name}</strong><br />
                  {lead.company}<br />
                  Score: {lead.score}/100
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
