#!/usr/bin/env bash
# Construit l'app : docs/ (GitHub Pages) et dist/index.html (version fichier unique).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/build"
TW="$ROOT/build/node_modules/.bin/tailwindcss"
[ -x "$TW" ] || TW="/home/claude/build/node_modules/.bin/tailwindcss"
[ -x "$TW" ] || TW="npx -y tailwindcss@3"
$TW -c tailwind.config.js -i in.css -o out.css --minify >/dev/null 2>&1
ROOT="$ROOT" python3 - <<'PY'
import os, shutil, time
root=os.environ['ROOT']; src=root+'/src/'
files=['data.js','logic.js','gh.js','ui.js','views1.js','views2.js','views3.js','views4.js','views5.js','main.js']
js='\n'.join(open(src+f, encoding='utf-8').read() for f in files)
css=open(root+'/build/out.css', encoding='utf-8').read()
h=open(src+'index.html', encoding='utf-8').read().replace('/*TAILWIND*/',css).replace('/*JS*/',js.replace('</script','<\\/script'))
build=time.strftime('%Y%m%d%H%M%S')
for out in ['docs','dist']: os.makedirs(root+'/'+out, exist_ok=True)
open(root+'/dist/index.html','w', encoding='utf-8').write(h)
open(root+'/docs/index.html','w', encoding='utf-8').write(h)
open(root+'/docs/sw.js','w', encoding='utf-8').write(open(src+'sw.js', encoding='utf-8').read().replace('__BUILD__', build))
shutil.copy(src+'manifest.webmanifest', root+'/docs/manifest.webmanifest')
shutil.copytree(src+'icons', root+'/docs/icons', dirs_exist_ok=True)
open(root+'/docs/.nojekyll','w').close()
print('build', build)
PY
node -e "new Function(require('fs').readFileSync('$ROOT/docs/index.html','utf8').split('<script>')[1].split('</script>')[0])" && echo OK
