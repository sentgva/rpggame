// Vercel Function: всё API игры (NestJS) в одной функции.
// Код собирается командой `npm run build` в apps/server/dist (см. vercel.json).
module.exports = require('../apps/server/dist/serverless.js').default;
