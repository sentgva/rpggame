import { artStyleOf, type ArtStyle } from '@idle/shared';
import { create } from 'zustand';

/** Текущий стиль графики персонажей (из настроек игрока); version растёт при смене — кадры перерисовываются. */
export const useArt = create<{ style: ArtStyle; version: number; set(s: ArtStyle): void }>((set, get) => ({
  style: artStyleOf(),
  version: 0,
  set(s) {
    if (get().style !== s) set({ style: s, version: get().version + 1 });
  },
}));

export const artStyle = () => useArt.getState().style;
export const artVersion = () => useArt.getState().version;

/** Векторные фигуры стройнее пиксельных «чиби» — показываем их на 15% крупнее (в бою и в интерфейсе). */
export const VECTOR_SCALE = 1.15;
