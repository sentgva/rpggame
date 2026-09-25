import type { ReactNode } from 'react';
import { create } from 'zustand';

export type Tab = 'battle' | 'heroes' | 'gear' | 'map' | 'hub';

export interface Screen {
  id: string;
  params?: Record<string, any>;
}

export interface Toast {
  id: number;
  text: string;
  kind: 'good' | 'bad' | 'info';
}

export interface Modal {
  id: number;
  render: (close: () => void) => ReactNode;
  /** Нельзя закрыть тапом по фону. */
  sticky?: boolean;
}

interface UiStore {
  tab: Tab;
  stacks: Record<Tab, Screen[]>;
  modals: Modal[];
  toasts: Toast[];
  /** Выбранная героиня во вкладке снаряжения. */
  gearHero: string | null;
  setTab(t: Tab): void;
  push(s: Screen): void;
  pop(): void;
  resetStack(t?: Tab): void;
  open(render: Modal['render'], opts?: { sticky?: boolean }): number;
  close(id?: number): void;
  toast(text: string, kind?: Toast['kind']): void;
  setGearHero(id: string | null): void;
}

let nextId = 1;

export const useUi = create<UiStore>((set, get) => ({
  tab: 'battle',
  stacks: { battle: [], heroes: [], gear: [], map: [], hub: [] },
  modals: [],
  toasts: [],
  gearHero: null,
  setTab(tab) {
    if (get().tab === tab) {
      // повторный тап по вкладке — вернуться к её корню
      set((s) => ({ stacks: { ...s.stacks, [tab]: [] } }));
      return;
    }
    set({ tab });
  },
  push(screen) {
    set((s) => ({ stacks: { ...s.stacks, [s.tab]: [...s.stacks[s.tab], screen] } }));
  },
  pop() {
    set((s) => ({ stacks: { ...s.stacks, [s.tab]: s.stacks[s.tab].slice(0, -1) } }));
  },
  resetStack(t) {
    const tab = t ?? get().tab;
    set((s) => ({ stacks: { ...s.stacks, [tab]: [] } }));
  },
  open(render, opts) {
    const id = nextId++;
    set((s) => ({ modals: [...s.modals, { id, render, sticky: opts?.sticky }] }));
    return id;
  },
  close(id) {
    set((s) => ({ modals: id === undefined ? s.modals.slice(0, -1) : s.modals.filter((m) => m.id !== id) }));
  },
  toast(text, kind = 'info') {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, text, kind }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 2600);
  },
  setGearHero(id) {
    set({ gearHero: id });
  },
}));

/** Перейти на вкладку и открыть экран. */
export function navigate(tab: Tab, screen?: Screen) {
  const ui = useUi.getState();
  useUi.setState((s) => ({ tab, stacks: { ...s.stacks, [tab]: screen ? [screen] : [] } }));
  void ui;
}
