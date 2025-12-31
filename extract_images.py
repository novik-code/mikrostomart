import requests
from bs4 import BeautifulSoup
import os
import urllib.parse

# Targeted articles that contain real case photos
TARGET_URLS = [
    "https://mikrostomart.pl/aktualnosci/313-metamorfoza-2",
    "https://mikrostomart.pl/aktualnosci/314-metamorfoza-3",
    "https://mikrostomart.pl/aktualnosci/311-metamorfoza",
    "https://mikrostomart.pl/aktualnosci/303-zawsze-sie-znajdzie-ktos-kto-zrobi-taniej",
    "https://mikrostomart.pl/aktualnosci/279-kolejna-metamorfoza-usmiechu-w-naszym-wykonaniu-2"
]

SAVE_DIR = "public/images/articles/real_cases"
os.makedirs(SAVE_DIR, exist_ok=True)

def get_soup(url):
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def download_image(img_url, prefix):
    try:
        # Handle relative URLs
        if not img_url.startswith('http'):
            img_url = urllib.parse.urljoin("https://mikrostomart.pl", img_url)
            
        filename = img_url.split('/')[-1]
        # Sanitize filename
        filename = "".join([c for c in filename if c.isalpha() or c.isdigit() or c in ['.', '-', '_']]).rstrip()
        local_path = os.path.join(SAVE_DIR, f"{prefix}_{filename}")
        
        # Don't re-download if exists
        if os.path.exists(local_path):
            return local_path

        r = requests.get(img_url, stream=True)
        if r.status_code == 200:
            with open(local_path, 'wb') as f:
                for chunk in r.iter_content(1024):
                    f.write(chunk)
            print(f"Downloaded: {local_path}")
            return local_path
    except Exception as e:
        print(f"Failed to download {img_url}: {e}")
    return None

def main():
    print("Starting image extraction...")
    
    extraction_results = {}

    for url in TARGET_URLS:
        print(f"Scanning: {url}")
        slug = url.split('/')[-1].replace('.html', '')
        soup = get_soup(url)
        if not soup: continue
        
        content_div = soup.select_one('.item-page, .article-content, [itemprop="articleBody"]')
        if not content_div:
            print("No content div found")
            continue
            
        images = content_div.find_all('img')
        downloaded_images = []
        
        for i, img in enumerate(images):
            src = img.get('src')
            if src:
                # Filter out small icons or layout gifs if needed, or keeping all for now
                if 'printButton' in src or 'emailButton' in src: continue
                
                local_path = download_image(src, f"{slug}_{i}")
                if local_path:
                    # Convert to public web path
                    web_path = local_path.replace('public', '') 
                    downloaded_images.append(web_path)
        
        if downloaded_images:
            extraction_results[slug] = downloaded_images
            
    # Print results in a way we can copy-paste into articles.ts
    print("\n--- EXTRACTION RESULTS ---\n")
    for slug, imgs in extraction_results.items():
        print(f"SLUG: {slug}")
        markdown_imgs = "\n".join([f"![Zdjęcie z zabiegu]({img})" for img in imgs])
        print(markdown_imgs)
        print("-" * 20)

if __name__ == "__main__":
    main()
