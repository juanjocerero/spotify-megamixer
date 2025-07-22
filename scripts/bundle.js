// scripts/gen-bundle.js
const fs = require('fs');
const path = require('path');
const glob = require('glob');

const ROOT = path.resolve(__dirname, '..');

// 1. Lista explícita de ficheros fijos
const EXPLICIT = [
  'auth.js',
  'middleware.ts',
  'types/spotify.d.ts',
  'prisma/schema.prisma',
  'app/dashboard/page.tsx',
  'package.json',
  'tailwind.config.js',
  'postcss.config.mjs'
];

// 2. Carpetas globales con extensiones y filtros
const GLOBS = [
  'lib/**/*.{js,ts,tsx,jsx,mjs,d.ts}',
  'components/custom/**/*.{js,ts,tsx,jsx,mjs,d.ts}'
];

// 3. Conjunto de ignores
const IGNORE = [
  '**/.next/**',
  '**/node_modules/**',
  '**/.git/**',
  '**/*.test.*',
  '**/*.spec.*',
  '**/__tests__/**',
  '**/*.stories.*'
];

// Helpers
const stripComments = (code) =>
  code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*/g, '');

const removeImports = (code) =>
  code
    .split(/\r?\n/)
    .filter(line => !line.trim().startsWith('import'))
    .join('\n');

// Recolectar rutas
const explicitPaths = EXPLICIT
  .map(p => path.join(ROOT, p))
  .filter(fs.existsSync)
  .map(p => path.relative(ROOT, p));

const globPaths = GLOBS.flatMap(pattern =>
  glob.sync(pattern, { cwd: ROOT, ignore: IGNORE })
);

const files = [...new Set([...explicitPaths, ...globPaths])].sort();

const out = [];
out.push('=== FILE INDEX ===');
files.forEach((f, i) => out.push(`${i}: ${f}`));
out.push('');

// Contenidos
files.forEach(f => {
  const fullPath = path.join(ROOT, f);
  const raw = fs.readFileSync(fullPath, 'utf8');

  const noComments = stripComments(raw);
  const noImports = removeImports(raw);
  const noCommentsNoImports = removeImports(noComments);

  const min = noCommentsNoImports
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(l => l.length)
    .join(' ');
  out.push(`=== ${f} ===`);
  out.push(min);
  out.push('');
});

console.log(out.join('\n'));