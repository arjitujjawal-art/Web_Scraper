// Custom High-Tech Cyber Dark Vector Style for Google Maps
export const cyberDarkMapStyle: any[] = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#090e1c' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#090e1c' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#0b162c' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#131e36' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#1e2d4d' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#1a2c4e' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#0e172a' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'transit',
    elementType: 'geometry',
    stylers: [{ color: '#111d33' }],
  },
  {
    featureType: 'transit.station',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#64748b' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#040711' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#040711' }],
  },
];

export const DOMAIN_COLORS: Record<string, { bg: string; text: string; glow: string; hex: string }> = {
  'AI/ML': {
    bg: 'bg-cyan-500/15',
    text: 'text-cyan-400',
    glow: 'rgba(6, 182, 212, 0.6)',
    hex: '#06b6d4',
  },
  'Robotics': {
    bg: 'bg-purple-500/15',
    text: 'text-purple-400',
    glow: 'rgba(168, 85, 247, 0.6)',
    hex: '#a855f7',
  },
  'Biotech': {
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-400',
    glow: 'rgba(16, 185, 129, 0.6)',
    hex: '#10b981',
  },
  'Climate & Energy': {
    bg: 'bg-green-500/15',
    text: 'text-green-400',
    glow: 'rgba(34, 197, 94, 0.6)',
    hex: '#22c55e',
  },
  'Semiconductors': {
    bg: 'bg-amber-500/15',
    text: 'text-amber-400',
    glow: 'rgba(245, 158, 11, 0.6)',
    hex: '#f59e0b',
  },
  'Quantum': {
    bg: 'bg-indigo-500/15',
    text: 'text-indigo-400',
    glow: 'rgba(99, 102, 241, 0.6)',
    hex: '#6366f1',
  },
  'Fintech': {
    bg: 'bg-blue-500/15',
    text: 'text-blue-400',
    glow: 'rgba(59, 130, 246, 0.6)',
    hex: '#3b82f6',
  },
  'Cybersecurity': {
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    glow: 'rgba(244, 63, 94, 0.6)',
    hex: '#f43f5e',
  },
};

export const CITY_CENTERS = {
  delhi: {
    name: 'Delhi NCR',
    center: { lat: 28.5700, lng: 77.2000 },
    zoom: 11,
  },
  sf: {
    name: 'San Francisco Bay Area',
    center: { lat: 37.7749, lng: -122.3500 },
    zoom: 10,
  },
};
