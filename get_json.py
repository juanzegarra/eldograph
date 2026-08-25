import re
import json
import ast
from pathlib import Path

base_dir = Path(__file__).parent if "__file__" in globals() else Path.cwd()

def extract_js_array(html_content):
    # Find start of links = [
    match = re.search(r'(?:var|let|const)?\s*links\s*=\s*\[', html_content)
    if not match:
        return None

    start_idx = match.end() - 1  # Index of opening '['
    bracket_count = 0

    # Match opening/closing brackets to safely grab the full array
    for i in range(start_idx, len(html_content)):
        char = html_content[i]
        if char == '[':
            bracket_count += 1
        elif char == ']':
            bracket_count -= 1
            if bracket_count == 0:
                return html_content[start_idx:i+1]
    return None

def get_json_from_html(html_file):
    html_file = Path(html_file)
    json_file = html_file.with_suffix(".json")

    with open(html_file, "r", encoding="utf-8") as f:
        html = f.read()

    links_str = extract_js_array(html)
    if not links_str:
        print(f"[FAIL] Could not locate 'links' array bounds in {html_file.name}")
        return None

    # Fix unquoted JS keys: {source: -> {"source":
    fixed_str = re.sub(r'(?<=[{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'"\1":', links_str)

    # Clean trailing commas: , ] -> ] or , } -> }
    fixed_str = re.sub(r',\s*([\]}])', r'\1', fixed_str)

    try:
        links = json.loads(fixed_str)
    except json.JSONDecodeError:
        try:
            # Fallback to Python AST parsing for single quotes / valid literals
            links = ast.literal_eval(fixed_str)
        except Exception as e:
            print(f"[FAIL] JSON parsing failed for {html_file.name}: {e}")
            return None

    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(links, f, indent=2)

    return json_file

# --- Execution ---
html_files = list(base_dir.rglob("*.html"))
print(f"Found {len(html_files)} HTML file(s).")

new_json_files = []
for html_file in html_files:
    # Optional: comment out the next 2 lines if you want to overwrite existing .json files for testing
    if html_file.with_suffix(".json").exists():
        continue

    result = get_json_from_html(html_file)
    if result:
        new_json_files.append(str(result))

print(f"\nDone! Created {len(new_json_files)} file(s):")
print(new_json_files)
