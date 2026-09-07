import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from production build directory
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`===================================================`);
  console.log(`  Grocery POS System - Ready and Running!`);
  console.log(`  Open in browser: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
