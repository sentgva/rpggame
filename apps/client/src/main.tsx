import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { loadPixelFont } from './styles/pixelFont';
import { installErrorTrap } from './net/diag';
import { useGame } from './store/game';
import { useUi } from './store/ui';
import { initTelegram } from './tg/telegram';

initTelegram();
// отладочный доступ к стору в dev-сборке (скриншотные проверки)
if (import.meta.env.DEV) Object.assign(window, { __game: useGame, __ui: useUi });
installErrorTrap();
void loadPixelFont();
createRoot(document.getElementById('root')!).render(<App />);
