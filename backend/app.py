import os
import json
import requests
import mimetypes
from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)

# --- CONFIGURATION ---
# Configurable save directory.
# We will create subfolders per query inside this directory.
SAVE_DIR = os.path.join(os.getcwd(), "downloaded_images")

# Cache to store search results: { query_string: [processed_items...] }
# We cache the "max fetched so far" per query, and slice to requested total.
SEARCH_CACHE = {}


def ensure_save_dir(query_name):
    """Creates the save directory for a specific query if it doesn't exist."""
    safe_name = "".join([c if c.isalnum() or c in (' ', '-', '_') else '_' for c in query_name]).strip()
    path = os.path.join(SAVE_DIR, safe_name)
    if not os.path.exists(path):
        os.makedirs(path)
    return path


@app.route('/api/keywords', methods=['GET'])
def get_keywords():
    """Reads keywords from keywords.txt in the project root."""
    try:
        if os.path.exists('keywords.txt'):
            path = 'keywords.txt'
        elif os.path.exists('../keywords.txt'):
            path = '../keywords.txt'
        else:
            return jsonify([])

        with open(path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
        return jsonify(lines)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/search', methods=['GET'])
def search_images():
    """
    Proxies search to Google Custom Search API.
    Expects params: q, apiKey, cx.
    Optional param: total (how many images to return; will paginate; max 100).
    Returns cached results if available for the query (and enough items are cached).
    """
    query = request.args.get('q')
    api_key = request.args.get('apiKey')
    cx = request.args.get('cx')

    # total requested by frontend (default 10). Google CSE: max 100.
    try:
        total = int(request.args.get('total', '10'))
    except ValueError:
        total = 10

    total = max(1, min(total, 100))

    if not query:
        return jsonify({"error": "Missing query"}), 400

    if not api_key or not cx:
        return jsonify({"error": "Missing API configuration"}), 400

    # If we already cached enough results for this query, serve from cache.
    cached = SEARCH_CACHE.get(query, [])
    if len(cached) >= total:
        print(f"Serving cached results for: {query} ({total})")
        return jsonify(cached[:total])

    print(f"Fetching from Google: {query} (need {total}, cached {len(cached)})")

    google_url = "https://www.googleapis.com/customsearch/v1"

    # We'll fetch more pages until we have `total` or Google runs out.
    # Google Custom Search limits:
    # - num: 1..10
    # - start: 1.. (max 91 to stay within 100 results)
    results = list(cached)  # start with what we already have

    try:
        while len(results) < total:
            start = len(results) + 1  # 1, 11, 21, ...
            if start > 91:
                break

            num = min(10, total - len(results))  # Google allows up to 10 per request

            params = {
                'key': api_key,
                'cx': cx,
                'q': query,
                'searchType': 'image',
                'num': num,
                'start': start
            }

            resp = requests.get(google_url, params=params, timeout=30)
            resp.raise_for_status()
            data = resp.json()

            items = data.get('items', []) or []
            if not items:
                break

            for item in items:
                results.append({
                    'id': len(results) + 1,  # global incremental id
                    'link': item.get('link'),
                    'title': item.get('title'),
                    'image': item.get('image', {}),
                    'displayLink': item.get('displayLink'),
                    'mime': item.get('mime'),
                    'fileFormat': item.get('fileFormat')
                })

        # Cache the max fetched so far
        SEARCH_CACHE[query] = results

        return jsonify(results[:total])

    except requests.HTTPError as e:
        # Try to surface Google error details
        try:
            err_json = resp.json()
        except Exception:
            err_json = None

        print(f"Search HTTP error: {e} / details: {err_json}")
        if err_json:
            return jsonify({"error": err_json}), 500
        return jsonify({"error": str(e)}), 500

    except Exception as e:
        print(f"Search error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/download', methods=['POST'])
def download_image():
    """
    Downloads an image to the local server.
    Body: { id, imageUrl, query }
    """
    data = request.json
    img_id = data.get('id')
    image_url = data.get('imageUrl')
    query = data.get('query')

    if not all([img_id, image_url, query]):
        return jsonify({"error": "Missing data"}), 400

    try:
        folder_path = ensure_save_dir(query)

        parsed = urlparse(image_url)
        path = parsed.path
        ext = os.path.splitext(path)[1]

        if not ext:
            try:
                head = requests.head(image_url, timeout=5)
                content_type = head.headers.get('content-type')
                ext = mimetypes.guess_extension(content_type)
            except Exception:
                pass

        if not ext:
            ext = ".jpg"

        filename = f"{img_id}{ext}"
        full_path = os.path.join(folder_path, filename)

        print(f"Downloading {image_url} -> {full_path}")

        with requests.get(image_url, stream=True, timeout=30) as r:
            r.raise_for_status()
            with open(full_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

        return jsonify({"status": "success", "path": full_path})

    except Exception as e:
        print(f"Download failed: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    if not os.path.exists(SAVE_DIR):
        os.makedirs(SAVE_DIR)

    print("Starting Backend...")
    print(f"Images will be saved to: {SAVE_DIR}")
    app.run(host='0.0.0.0', port=5000, debug=True)
