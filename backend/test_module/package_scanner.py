import os
import ast
import sys
import argparse
import json
import urllib.request
import re
from decouple import config

class ImportExtractor(ast.NodeVisitor):
    """AST Visitor to extract all imports from a Python file."""
    def __init__(self):
        self.imports = set()

    def visit_Import(self, node):
        for alias in node.names:
            self.imports.add(alias.name.split('.')[0])
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.module:
            self.imports.add(node.module.split('.')[0])
        self.generic_visit(node)

def extract_imports_from_project(project_path):
    """Recursively parses all Python files in a directory and extracts imported modules."""
    extractor = ImportExtractor()
    
    for root, dirs, files in os.walk(project_path):
        # Skip virtual environments and hidden directories
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('venv', 'env', '__pycache__', 'node_modules')]
        
        for file in files:
            if file.endswith('.py'):
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        tree = ast.parse(f.read(), filename=file_path)
                        extractor.visit(tree)
                except Exception as e:
                    print(f"Warning: Could not parse {file_path}: {e}")

    # Filter out standard library modules (Python 3.10+)
    stdlib = sys.stdlib_module_names if hasattr(sys, 'stdlib_module_names') else set()
    third_party_imports = {imp for imp in extractor.imports if imp not in stdlib and imp != ''}
    
    # Filter out internal local modules (heuristic: check if there's a folder/file matching the name)
    external_imports = set()
    for imp in third_party_imports:
        if not os.path.exists(os.path.join(project_path, imp)) and not os.path.exists(os.path.join(project_path, f"{imp}.py")):
            external_imports.add(imp)

    return list(external_imports)

def extract_from_requirements(project_path):
    """Finds all requirements.txt files and extracts package names."""
    req_packages = set()
    for root, dirs, files in os.walk(project_path):
        dirs[:] = [d for d in dirs if not d.startswith('.') and d not in ('venv', 'env', '__pycache__', 'node_modules')]
        for file in files:
            if file == 'requirements.txt':
                file_path = os.path.join(root, file)
                print(f"Found requirements file at: {file_path}")
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        for line in f:
                            line = line.strip()
                            # ignore comments and empty lines
                            if line and not line.startswith('#') and not line.startswith('-e'):
                                # Extract package name before any ==, >=, etc.
                                pkg_name = re.split(r'[=<>~![@]', line)[0].strip()
                                if pkg_name:
                                    # Handle underscore vs dash differences
                                    req_packages.add(pkg_name.lower().replace('-', '_'))
                except Exception as e:
                    print(f"Warning: Could not parse {file_path}: {e}")
    return list(req_packages)

def analyze_with_ai(packages, api_key):
    """Sends the list of packages to an AI (Gemini) for analysis."""
    if not packages:
        return "No external packages found."

    print(f"Analyzing {len(packages)} packages with AI...")
    
    prompt = (
        "I am working on a Python project and using the following third-party packages:\n"
        f"{', '.join(packages)}\n\n"
        "Please provide a comprehensive analysis of this stack. Include:\n"
        "1. What kind of project does this look like? (e.g. Django web app, Data Science, etc.)\n"
        "2. Are there any known major security vulnerabilities, deprecated packages, or red flags in this list?\n"
        "3. Are there any overlapping tools? (e.g. using both requests and httpx)\n"
        "4. Strictly review the list of packages, scan and check if it is comprised, vulnerable or poisoned?"
    )

    # Using Google Gemini API securely by passing the API key in headers instead of URL params
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    headers = {
        'Content-Type': 'application/json',
        'x-goog-api-key': api_key
    }
    data = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers)
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            text_response = result['candidates'][0]['content']['parts'][0]['text']
            return text_response
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        return f"AI Analysis failed: HTTP Error {e.code}\nDetails: {error_body}"
    except Exception as e:
        return f"AI Analysis failed: {e}\nMake sure your GEMINI_API_KEY is valid."

def main():
    parser = argparse.ArgumentParser(description="AI-powered Python package scanner.")
    parser.add_argument("path", help="Path to the Python project directory")
    args = parser.parse_args()

    project_path = args.path
    if not os.path.isdir(project_path):
        print(f"Error: {project_path} is not a valid directory.")
        sys.exit(1)

    print(f"Scanning project at {project_path} for python files...")
    ast_packages = extract_imports_from_project(project_path)
    print(f"Scanning project for requirements.txt...")
    req_packages = extract_from_requirements(project_path)
    
    # Merge both lists (normalizing names for comparison)
    all_packages = set(ast_packages) | set(req_packages)
    
    print("\n--- Discovered External Packages ---")
    for pkg in sorted(all_packages):
        source = []
        if pkg in ast_packages:
            source.append("Code")
        if pkg in req_packages:
            source.append("Requirements")
        print(f"- {pkg} (Found in: {', '.join(source)})")
    print("------------------------------------\n")

    api_key = config("GEMINI_API_KEY", default="")
    api_key = api_key.strip("'\"") # Clean up any accidental quotes from .env
    if not api_key:
        print("Note: GEMINI_API_KEY environment variable not set.")
        print("Set it to get an AI analysis of your packages.")
        print("Example: GEMINI_API_KEY='your_api_key'")
        sys.exit(0)

    analysis = analyze_with_ai(list(all_packages), api_key)
    
    print("\n========= AI ANALYSIS =========")
    print(analysis)
    print("===============================")

if __name__ == "__main__":
    main()
