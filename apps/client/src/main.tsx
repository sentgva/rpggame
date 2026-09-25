import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { loadPixelFont } from './styles/pixelFont';
import { useGame } from './store/game';
import { initTelegram } from './tg/telegram';

initTelegram();
// отладочный доступ к стору в dev-сборке (скриншотные проверки)
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;
void loadPixelFont();
createRoot(document.getElementById('root')!).render(<App />);
