
import os

def generate_showcase():
    assets_file = 'assets_list.txt'
    if not os.path.exists(assets_file):
        print(f"{assets_file} not found. Run 'find public/assets/vendor public/assets/tiles -name \"*.png\" -o -name \"*.jpg\" -o -name \"*.jpeg\" -o -name \"*.gif\" | sort > {assets_file}' first.")
        return

    with open(assets_file, 'r') as f:
        files = [line.strip() for line in f.readlines()]

    groups = {}
    for f in files:
        rel_path = f
        display_path = f.replace('public/assets/', '')
        parts = display_path.split('/')
        if len(parts) > 1:
            group_name = '/'.join(parts[:-1])
        else:
            group_name = 'Root'
        
        if group_name not in groups:
            groups[group_name] = []
        groups[group_name].append({
            'path': rel_path,
            'name': parts[-1]
        })

    html_template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tilemap Showcase - MyWorld Research</title>
    <style>
        :root {{
            --bg-color: #0f172a;
            --card-bg: #1e293b;
            --text-color: #f1f5f9;
            --accent-color: #38bdf8;
            --secondary-color: #94a3b8;
        }}
        body {{
            font-family: 'Inter', -apple-system, sans-serif;
            background-color: var(--bg-color);
            color: var(--text-color);
            margin: 0;
            padding: 2rem;
            line-height: 1.5;
        }}
        header {{
            margin-bottom: 3rem;
            border-bottom: 1px solid #334155;
            padding-bottom: 1rem;
        }}
        h1 {{ margin: 0; color: var(--accent-color); font-size: 2.5rem; }}
        h2 {{ margin-top: 2rem; color: var(--accent-color); border-left: 4px solid var(--accent-color); padding-left: 1rem; }}
        .stats {{ color: var(--secondary-color); font-size: 0.9rem; margin-top: 0.5rem; }}
        
        .group {{
            margin-bottom: 4rem;
        }}
        .grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
            gap: 1.5rem;
            margin-top: 1rem;
        }}
        .tile-card {{
            background: var(--card-bg);
            border-radius: 8px;
            padding: 1rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: transform 0.2s, box-shadow 0.2s;
            border: 1px solid #334155;
            overflow: hidden;
            cursor: pointer;
        }}
        .tile-card:hover {{
            transform: translateY(-4px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3);
            border-color: var(--accent-color);
        }}
        .img-container {{
            width: 100%;
            height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            background-image: 
                linear-gradient(45deg, #2a3544 25%, transparent 25%), 
                linear-gradient(-45deg, #2a3544 25%, transparent 25%), 
                linear-gradient(45deg, transparent 75%, #2a3544 75%), 
                linear-gradient(-45deg, transparent 75%, #2a3544 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
            border-radius: 4px;
            margin-bottom: 0.75rem;
            overflow: auto;
        }}
        .img-container img {{
            image-rendering: pixelated;
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            min-width: 64px;
            min-height: 64px;
        }}
        .large-image img {{
            min-width: unset;
            min-height: unset;
            max-width: none;
            max-height: none;
        }}
        .tile-info {{
            width: 100%;
            text-align: center;
        }}
        .tile-name {{
            font-size: 0.85rem;
            font-weight: 600;
            word-break: break-all;
            margin-bottom: 0.25rem;
        }}
        .tile-path {{
            font-size: 0.7rem;
            color: var(--secondary-color);
        }}
        
        .floating-nav {{
            position: fixed;
            top: 2rem;
            right: 2rem;
            background: rgba(30, 41, 59, 0.8);
            backdrop-filter: blur(8px);
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #334155;
            max-height: 80vh;
            overflow-y: auto;
            width: 250px;
            display: none;
        }}
        @media (min-width: 1200px) {{
            .floating-nav {{ display: block; }}
            body {{ padding-right: 300px; }}
        }}
        .nav-item {{
            display: block;
            color: var(--secondary-color);
            text-decoration: none;
            font-size: 0.8rem;
            padding: 0.25rem 0;
            border-radius: 4px;
        }}
        .nav-item:hover {{ color: var(--accent-color); }}
        
        #modal {{
            display: none;
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 1000;
            justify-content: center;
            align-items: center;
            cursor: pointer;
        }}
        #modal img {{
            max-width: 95%;
            max-height: 95%;
            image-rendering: pixelated;
            object-fit: contain;
        }}
    </style>
</head>
<body>
    <header>
        <h1>Tilemap Showcase</h1>
        <div class="stats">Found {total_files} assets in {total_groups} directories</div>
    </header>

    <div class="floating-nav">
        <strong>Categories</strong>
        {nav_html}
    </div>

    <div id="modal" onclick="this.style.display='none'">
        <img id="modal-img" src="" alt="Full view">
    </div>

    <main>
        {content_html}
    </main>

    <script>
        function showModal(src) {{
            document.getElementById('modal-img').src = src;
            document.getElementById('modal').style.display = 'flex';
        }}
    </script>
</body>
</html>
"""
    
    content_html = ""
    nav_html = ""
    total_files = 0
    
    sorted_groups = sorted(groups.items())
    
    for group_name, items in sorted_groups:
        total_files += len(items)
        safe_id = group_name.replace('/', '-').replace('.', '-').replace(' ', '-')
        nav_html += f'<a href="#{safe_id}" class="nav-item">{{group_name}} ({{len(items)}})</a>\n'.format(group_name=group_name, len=len)
        # Wait, format() inside f-string is confusing.
        nav_html = nav_html.replace('{group_name}', group_name).replace('{len(items)}', str(len(items)))
        
        content_html += f'<section class="group" id="{safe_id}">\n'
        content_html += f'  <h2>{group_name}</h2>\n'
        content_html += f'  <div class="grid">\n'
        
        for item in items:
            is_large = any(x in item['name'].lower() for x in ["atlas", "tileset", "sheet"]) or item['name'].endswith('v1.7.png')
            container_class = "img-container large-image" if is_large else "img-container"
            
            content_html += f'    <div class="tile-card" onclick="showModal(\'{item["path"]}\')">\n'
            content_html += f'      <div class="{container_class}">\n'
            content_html += f'        <img src="{item["path"]}" alt="{item["name"]}" loading="lazy">\n'
            content_html += f'      </div>\n'
            content_html += f'      <div class="tile-info">\n'
            content_html += f'        <div class="tile-name">{item["name"]}</div>\n'
            content_html += f'        <div class="tile-path">{item["path"]}</div>\n'
            content_html += f'      </div>\n'
            content_html += f'    </div>\n'
            
        content_html += f'  </div>\n'
        content_html += f'</section>\n'

    full_html = html_template.format(
        total_files=total_files,
        total_groups=len(groups),
        nav_html=nav_html,
        content_html=content_html
    )
    
    output_file = 'tile-showcase.html'
    with open(output_file, 'w') as f:
        f.write(full_html)
    print(f"Generated {output_file}")

if __name__ == "__main__":
    generate_showcase()
