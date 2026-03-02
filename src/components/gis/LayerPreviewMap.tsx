'use client';

import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// This component is to fix the map bounds
const MapEffect = ({ data }: { data: any }) => {
    const map = useMap();

    useEffect(() => {
        if (data && data.features && data.features.length > 0) {
            try {
                const geoJsonLayer = L.geoJSON(data);
                const bounds = geoJsonLayer.getBounds();
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [10, 10], maxZoom: 15 });
                }
            } catch (e) {
                console.error("Error fitting bounds:", e);
            }
        }
    }, [data, map]);

    return null;
};


const LayerPreviewMap = ({ data, color }: { data: any, color: string }) => {
    if (!data) return null;

    // A unique key is needed to force re-render when data changes.
    const mapKey = useMemo(() => `${data.features.length}-${Math.random()}`, [data]);
    
    const featureStyle = {
        color: color,
        weight: 2,
        fillOpacity: 0.2,
        fillColor: color,
    };

    return (
        <MapContainer
            key={mapKey}
            center={[0, 0]}
            zoom={1}
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
            attributionControl={false}
            scrollWheelZoom={false}
            dragging={false}
            doubleClickZoom={false}
        >
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            />
            <GeoJSON data={data} style={featureStyle} />
            <MapEffect data={data} />
        </MapContainer>
    );
};

export default LayerPreviewMap;
