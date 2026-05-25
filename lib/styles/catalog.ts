import type { HiggsfieldMode } from '../types';

export interface StyleInfo {
  id: HiggsfieldMode;
  label_es: string;
  description_es: string;
  /** Lucide icon name for placeholder rendering. */
  icon: 'camera' | 'film' | 'video' | 'users' | 'image';
  /** Color seed for placeholder SVG gradient. */
  seed: string;
}

export const STYLE_CATALOG: StyleInfo[] = [
  {
    id: 'photodump',
    label_es: 'Fotos',
    description_es: 'Serie estética estilo viral de Instagram',
    icon: 'camera',
    seed: '#7C5CFF',
  },
  {
    id: 'soul-cinema-studio',
    label_es: 'Cine',
    description_es: 'Look cinematográfico, color rico, profundidad',
    icon: 'film',
    seed: '#F59E0B',
  },
  {
    id: 'cinema-studio',
    label_es: 'Cine Pro',
    description_es: 'Máxima calidad, render más lento y costoso',
    icon: 'video',
    seed: '#EF4444',
  },
  {
    id: 'soul-cast',
    label_es: 'Multi-persona',
    description_es: 'Múltiples caras consistentes en cada shot',
    icon: 'users',
    seed: '#10B981',
  },
  {
    id: 'image-to-video',
    label_es: 'Animar foto',
    description_es: 'Tomá una foto estática y dale vida',
    icon: 'image',
    seed: '#0EA5E9',
  },
];

export function getStyle(id: HiggsfieldMode): StyleInfo | undefined {
  return STYLE_CATALOG.find((s) => s.id === id);
}
