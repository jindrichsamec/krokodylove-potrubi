import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

const PUBLIC_DIR = fileURLToPath(new URL('./public', import.meta.url));
const SW_TEMPLATE = fileURLToPath(new URL('./src/sw.template.js', import.meta.url));

/**
 * Emits sw.js with the list of every built file, so the service worker can
 * store the whole game on the device at install time and run it offline.
 * The cache name is a hash of the build: a new deploy replaces the old cache.
 */
function offlineServiceWorker(): Plugin {
  return {
    name: 'offline-service-worker',
    apply: 'build',
    enforce: 'post', // after Vite has added index.html to the bundle
    generateBundle(_options, bundle) {
      const hash = createHash('sha1');
      const files = ['./'];
      for (const [name, item] of Object.entries(bundle)) {
        files.push(`./${name}`);
        hash.update(name).update(item.type === 'chunk' ? item.code : item.source);
      }
      for (const name of readdirSync(PUBLIC_DIR).sort()) {
        files.push(`./${name}`);
        hash.update(name).update(readFileSync(`${PUBLIC_DIR}/${name}`));
      }
      const source = readFileSync(SW_TEMPLATE, 'utf8')
        .replace('__VERSION__', hash.digest('hex').slice(0, 12))
        .replace("'__FILES__'", JSON.stringify(files));
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  // relative paths: works at the domain root and under /repo-name/ on GitHub Pages
  base: './',
  plugins: [offlineServiceWorker()],
  // host: true -> reachable from the iPad over Wi-Fi
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
});
