import type { ArtStyle } from '@idle/shared';
import { create } from 'zustand';

/** Текущий стиль графики персонажей (из настроек игрока); version растёт при смене — кадры перерисовываются. */
export const useArt = create<{ style: ArtStyle; version: number; set(s: ArtStyle): void }>((set, get) => ({
  style: 'vector',
  version: 0,
  set(s) {
    if (get().style !== s) set({ style: s, version: get().version + 1 });
  },
}));

export const artStyle = () => useArt.getState().style;
export const artVersion = () => useArt.getState().version;
