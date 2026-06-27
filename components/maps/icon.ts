import L from 'leaflet';

// react-leaflet's default marker images break under bundlers; define an inline
// SVG pin so no asset resolution is required.
const pinSvg = (color: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
  <path fill="${color}" stroke="#fff" stroke-width="1.5"
    d="M15 1C7.8 1 2 6.8 2 14c0 9 13 27 13 27s13-18 13-27C28 6.8 22.2 1 15 1z"/>
  <circle cx="15" cy="14" r="5" fill="#fff"/>
</svg>`;

export function cleanerIcon(color = '#0d9066') {
  return L.divIcon({
    className: 'cleanrus-pin',
    html: pinSvg(color),
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -38],
  });
}
