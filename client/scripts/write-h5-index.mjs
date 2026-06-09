import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const distDir = join(process.cwd(), 'dist');
const jsDir = join(distDir, 'js');
const appCssPath = join(distDir, 'css', 'app.css');
const htmlPath = join(distDir, 'index.html');

mkdirSync(distDir, { recursive: true });

const scripts = readdirSync(jsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => entry.name)
  .filter((name) => name.endsWith('.js'))
  .sort((left, right) => {
    if (left === 'app.js') {
      return 1;
    }
    if (right === 'app.js') {
      return -1;
    }
    return left.localeCompare(right);
  })
  .map((name) => `    <script src="/js/${name}"></script>`)
  .join('\n');

const appCss = readFileSync(appCssPath, 'utf8');

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>特产日程 H5</title>
    <link rel="icon" href="data:," />
    <style>${appCss}</style>
  </head>
  <body>
    <div id="app"></div>
${scripts}
  </body>
</html>
`;

writeFileSync(htmlPath, html, 'utf8');
console.log(`Wrote ${htmlPath}`);
