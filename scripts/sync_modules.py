#!/usr/bin/env python3
"""
Sincroniza os arquivos modulares:
- `css/styles.css`
- `js/app.js`
- `modules/modulo-XX.html`
- `img/*.png`

Gera:
1. `js/modules-data.js` (para funcionamento local padrão)
2. Fallback compacto no final de `index.html` para funcionamento 100% garantido
   mesmo quando o navegador abre `index.html` isolado via XDG Document Portal
   (`file:///run/user/1000/doc/.../index.html`).
"""
import os
import re
import json
import base64

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODULES_DIR = os.path.join(ROOT_DIR, 'modules')
CSS_FILE = os.path.join(ROOT_DIR, 'css', 'styles.css')
JS_APP_FILE = os.path.join(ROOT_DIR, 'js', 'app.js')
OUTPUT_JS = os.path.join(ROOT_DIR, 'js', 'modules-data.js')
INDEX_FILE = os.path.join(ROOT_DIR, 'index.html')

MODULE_TITLES = {
    # AWS Academy Cloud Developing
    "modulo-1": "1. Welcome to AWS Academy Cloud Developing",
    "modulo-2": "2. Introducing to Developing on AWS",
    "modulo-3": "3. Developing Storage Solutions",
    "modulo-4": "4. Securing Access to Cloud Resources",
    "modulo-5": "5. Developing Flexible NoSQL Solutions",
    "modulo-6": "6. Developing REST APIs",
    "modulo-7": "7. Developing Event-Driven Serverless Solutions",
    "modulo-8": "8. Introducing Containers and Container Services",
    "modulo-9": "9. Caching Information for Scalability",
    "modulo-10": "10. Developing with Messaging Services",
    "modulo-11": "11. Defining Workflows to Orchestrate Functions",
    "modulo-12": "12. Developing Secure Applications on AWS",
    "modulo-13": "13. Automating Deployment Using CI/CD Pipelines",
    # React Frontend Development
    "react-modulo-1": "1. Fundamentos do Ecossistema React",
    "react-modulo-2": "2. Componentes, JSX e Interatividade",
}


def main():
    modules_data = {}
    referenced_imgs = set()

    for filename in sorted(os.listdir(MODULES_DIR)):
        match_aws = re.match(r'^modulo-0*(\d+)\.html$', filename)
        match_react = re.match(r'^react-modulo-0*(\d+)\.html$', filename)

        if match_aws:
            mod_num = int(match_aws.group(1))
            mod_id = f'modulo-{mod_num}'
            track = 'aws'
        elif match_react:
            mod_num = int(match_react.group(1))
            mod_id = f'react-modulo-{mod_num}'
            track = 'react'
        else:
            continue

        filepath = os.path.join(MODULES_DIR, filename)
        with open(filepath, 'r', encoding='utf-8') as f:
            html_content = f.read()

        for img_src in re.findall(r'src=\"(img/[^\"]+)\"', html_content):
            referenced_imgs.add(img_src)

        modules_data[mod_id] = {
            'id': mod_id,
            'track': track,
            'number': mod_num,
            'title': MODULE_TITLES.get(mod_id, f'Module {mod_num}'),
            'file': f'modules/{filename}',
            'html': html_content
        }

    # 1. Atualizar js/modules-data.js
    js_content = (
        "// Auto-generated fallback bundle from modules/modulo-XX.html\n"
        "// Para atualizar após editar arquivos em modules/, execute: python3 scripts/sync_modules.py\n"
        "window.MODULES_DATA = "
        + json.dumps(modules_data, ensure_ascii=False, indent=2)
        + ";\n"
    )
    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(js_content)

    # 2. Preparar mapa de imagens para fallback caso aberto via /run/user/1000/doc/
    portal_img_map = {}
    for rel_img in sorted(referenced_imgs):
        abs_img = os.path.join(ROOT_DIR, rel_img)
        if os.path.exists(abs_img):
            with open(abs_img, 'rb') as img_f:
                b64 = base64.b64encode(img_f.read()).decode('ascii')
                mime = 'image/svg+xml' if rel_img.endswith('.svg') else 'image/png'
                portal_img_map[rel_img] = f'data:{mime};base64,{b64}'

    with open(CSS_FILE, 'r', encoding='utf-8') as f:
        css_text = f.read()
    # Compactar CSS em linha única para não poluir index.html no editor
    css_single_line = re.sub(r'\s+', ' ', css_text).strip()

    with open(JS_APP_FILE, 'r', encoding='utf-8') as f:
        app_js_text = f.read()
    # Remover comentários de linha antes de compactar se necessário, ou manter seguro com \n escapado?
    # Melhor manter o código JS válido ou em poucas linhas
    modules_json_compact = json.dumps(modules_data, ensure_ascii=False).replace('</', '<\\/')
    imgs_json_compact = json.dumps(portal_img_map, ensure_ascii=False)

    with open(INDEX_FILE, 'r', encoding='utf-8') as f:
        index_html = f.read()

    # Remover bloco de fallback anterior se existir
    index_html = re.sub(
        r'\s*<!-- PORTAL-FALLBACK-START -->[\s\S]*?<!-- PORTAL-FALLBACK-END -->',
        '',
        index_html
    )

    fallback_block = (
        "\n    <!-- PORTAL-FALLBACK-START -->\n"
        f"    <style id=\"portal-fallback-css\">{css_single_line}</style>\n"
        f"    <script id=\"portal-fallback-data\">if(!window.MODULES_DATA){{window.MODULES_DATA={modules_json_compact};}}window.PORTAL_IMG_FALLBACK={imgs_json_compact};</script>\n"
        f"    <script id=\"portal-fallback-app\">\n{app_js_text}\n    </script>\n"
        "    <!-- PORTAL-FALLBACK-END -->\n"
    )

    index_html = index_html.replace('</body>', fallback_block + '</body>')

    with open(INDEX_FILE, 'w', encoding='utf-8') as f:
        f.write(index_html)

    print(f"Sincronizado com sucesso! {len(modules_data)} módulos e {len(portal_img_map)} imagens integrados.")


if __name__ == '__main__':
    main()
