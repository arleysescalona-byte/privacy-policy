"""Genera westeros-sin-internet.html: un solo archivo que funciona sin conexión.

Mete las tipografías dentro del archivo (base64) y añade la cabecera HTML
completa para abrirlo directamente en el navegador del celular o la PC.
Uso: python3 juego-westeros/build_offline.py
"""
import base64
import pathlib
import re
import urllib.request

HERE = pathlib.Path(__file__).parent
SRC = HERE / "index.html"
OUT = HERE / "westeros-sin-internet.html"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


src = SRC.read_text(encoding="utf-8")
css_url = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)">', src).group(1).replace("&amp;", "&")
css = fetch(css_url).decode()

# Solo el subconjunto "latin" (incluye tildes y ñ); los demás alfabetos no hacen falta.
faces = []
for block in re.findall(r"/\* latin \*/\s*(@font-face\s*\{.*?\})", css, re.S):
    url = re.search(r"url\((https://[^)]+)\)", block).group(1)
    data = base64.b64encode(fetch(url)).decode()
    faces.append(block.replace(url, "data:font/woff2;base64," + data))

src = re.sub(r'<link rel="(preconnect|stylesheet)"[^>]*>\n', "", src)
head, body = src.split('<div class="app">', 1)
page = (
    '<!doctype html>\n<html lang="es">\n<head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
    '<meta name="theme-color" content="#0c1d24">\n'
    "<style>\n" + "\n".join(faces) + "\n</style>\n"
    + head + "</head>\n<body>\n" + '<div class="app">' + body + "\n</body>\n</html>\n"
)
assert "https://fonts" not in page and "<link" not in page
OUT.write_text(page, encoding="utf-8")
print(f"{OUT.name}: {len(page.encode()) // 1024} KB, {len(faces)} tipografías incluidas")
