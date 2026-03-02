'use client';

import { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

export default function MousePositionControl() {
    const map = useMap();
    const [coords, setCoords] = useState<string>('');
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // This is to prevent map events (like click) when interacting with the control.
        if (ref.current) {
            L.DomEvent.disableClickPropagation(ref.current);
            L.DomEvent.disableScrollPropagation(ref.current);
        }
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: L.LeafletMouseEvent) => {
            setCoords(`Lat: ${e.latlng.lat.toFixed(5)}, Lng: ${e.latlng.lng.toFixed(5)}`);
        };

        const handleMouseOut = () => {
            setCoords('');
        };

        map.on('mousemove', handleMouseMove);
        map.on('mouseout', handleMouseOut);

        return () => {
            map.off('mousemove', handleMouseMove);
            map.off('mouseout', handleMouseOut);
        };
    }, [map]);

    return (
        <div ref={ref} className="leaflet-control-container">
            <div className="leaflet-bottom leaflet-left">
                <div 
                    className="leaflet-control bg-white/80 backdrop-blur-xl shadow-lg rounded-lg px-2 py-1 border border-slate-200/50 text-xs text-foreground font-mono transition-opacity duration-200" 
                    style={{ pointerEvents: 'auto', opacity: coords ? 1 : 0 }}
                >
                    {coords || '...'}
                </div>
            </div>
        </div>
    );
}
