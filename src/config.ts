// External services. The tile URL is not hard-coded in components so the server can be switched
// without code changes (OSMF tile policy). Tiles are only loaded as the user views them, never prefetched.
export const TILE_URL = import.meta.env.VITE_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
export const TILE_MAX_ZOOM = 19;
