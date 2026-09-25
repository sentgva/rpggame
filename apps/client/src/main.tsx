import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { loadPixelFont } from './styles/pixelFont';
import { initTelegram } from './tg/telegram';

initTelegram();
void loadPixelFont();
createRoot(document.getElementById('root')!).render(<App />);
