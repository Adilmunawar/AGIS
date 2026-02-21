export type MapLayer = {
  id: string;
  name: string;
  url: string;
  attribution: string;
  previewImageUrl: string;
  imageHint: string;
};

export const mapLayers: MapLayer[] = [
  {
    id: 'google-satellite',
    name: 'Satellite',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps',
    previewImageUrl: 'https://picsum.photos/seed/satellite/128/128',
    imageHint: 'satellite view',
  },
  {
    id: 'esri-world-imagery',
    name: 'Esri Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri &mdash; i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    previewImageUrl: 'https://picsum.photos/seed/imagery/128/128',
    imageHint: 'satellite imagery',
  },
  {
    id: 'osm-street',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    previewImageUrl: 'https://picsum.photos/seed/street/128/128',
    imageHint: 'street map',
  },
  {
    id: 'opentopomap',
    name: 'Topographic',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap (CC-BY-SA)',
    previewImageUrl: 'https://picsum.photos/seed/topography/128/128',
    imageHint: 'topographic map',
  },
  {
    id: 'carto-light',
    name: 'Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    previewImageUrl: 'https://picsum.photos/seed/lightmap/128/128',
    imageHint: 'light map',
  },
  {
    id: 'carto-dark',
    name: 'Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    previewImageUrl: 'https://picsum.photos/seed/darkmap/128/128',
    imageHint: 'dark map',
  },
];
