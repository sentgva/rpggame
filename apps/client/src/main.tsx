import '@fontsource/manrope/500.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import '@fontsource/tiny5/400.css';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/global.css';
import { initTelegram } from './tg/telegram';

initTelegram();
createRoot(document.getElementById('root')!).render(<App />);
