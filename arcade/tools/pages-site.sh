#!/bin/sh
# The site a web host publishes (Cloudflare Pages, or any host that runs a build command): only what the game loads
# (the page, its sound test, three.js, the generated files), copied into arcade/site/, with a header asking search
# engines not to list or keep it. Nothing else under arcade/ (the course content's sources, the tools, the docs, the
# backups) goes on the web; the course content the game plays is already inside the page.
#   sh arcade/tools/pages-site.sh       (from anywhere: it finds the arcade folder itself)
# A host's settings: build command `sh arcade/tools/pages-site.sh`, build output directory `arcade/site`.
set -e
cd "$(dirname "$0")/.."
rm -rf site
mkdir -p site
cp index.html sound-test.html site/
cp -R vendor assets site/
printf '/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n' > site/_headers
echo "arcade/site: $(find site -type f | wc -l | tr -d ' ') files, $(du -sh site | cut -f1)"
