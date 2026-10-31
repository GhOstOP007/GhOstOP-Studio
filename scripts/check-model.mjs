import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const dir = join(process.cwd(), 'models', 'Xenova', 'clip-vit-base-patch32');
if (!existsSync(dir) || !readdirSync(dir).length) {
  console.error('CLIP model is missing. Run: python -m pip install -r requirements-model.txt && npm run model:download');
  process.exit(1);
}
console.log('Local CLIP model assets found.');
