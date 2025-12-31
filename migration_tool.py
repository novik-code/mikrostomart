import requests
from bs4 import BeautifulSoup
import json
import time

BASE_URL = "https://mikrostomart.pl"
NEWS_URL = "https://mikrostomart.pl/aktualnosci"

def get_soup(url):
    try:
        response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'})
        response.raise_for_status()
        return BeautifulSoup(response.text, 'html.parser')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return None

def fetch_article_links():
    links = []
    # Pagination loop
    # Joomla standard pagination matches user info: ?start=5, ?start=10 etc.
    # We'll try to fetch a few pages.
    
    page_step = 5
    max_pages = 10 # Safety limit
    
    for i in range(max_pages):
        start_param = i * page_step
        url = f"{NEWS_URL}?start={start_param}" if i > 0 else NEWS_URL
        print(f"Crawling list page: {url}")
        
        soup = get_soup(url)
        if not soup:
            break
            
        current_page_links = []
        for a in soup.find_all('a', href=True):
            href = a['href']
            # Refined filter to catch article links
            if '/aktualnosci/' in href and href != '/aktualnosci' and 'start=' not in href:
                 full_url = BASE_URL + href if href.startswith('/') else href
                 # Avoid duplicates and check if it looks like an article ID
                 if full_url.startswith(BASE_URL) and full_url not in links:
                     # Check if it has a numeric ID which usually indicates an article
                     # e.g. /320-title
                     if any(char.isdigit() for char in href.split('/')[-1]):
                        current_page_links.append(full_url)
        
        if not current_page_links:
            print("No more article links found on this page.")
            break
            
        # If all links on this page are already in our list, we might be looping or done
        new_links = [l for l in current_page_links if l not in links]
        if not new_links:
            print("No new unique links found. Stopping pagination.")
            break
            
        links.extend(new_links)
        time.sleep(1)

    return list(set(links))

def scrape_article(url):
    soup = get_soup(url)
    if not soup:
        return None

    # Try to find title
    title = None
    # Common Joomla/WP selectors
    possible_titles = soup.select('h1, h2.item-title, .page-header h2')
    if possible_titles:
        title = possible_titles[0].get_text(strip=True)
    
    # Try to find date
    date = "2024-01-01" # Default
    # Look for standard date classes
    possible_dates = soup.select('.created-date, .published, time, .date')
    if possible_dates:
        date_text = possible_dates[0].get_text(strip=True)
        # simplistic parsing/cleaning if needed
        date = date_text

    # Content
    content = ""
    # Try to find the main article body
    article_body = soup.select('.item-page, .article-content, .entry-content, [itemprop="articleBody"]')
    if article_body:
        # Get text, maybe clean up a bit
        # Converting simple HTML to text/markdown-ish
        body = article_body[0]
        
        # Remove scripts/styles
        for script in body(["script", "style"]):
            script.decompose()
            
        text_parts = []
        for p in body.find_all(['p', 'h3', 'h4', 'ul']):
            text = p.get_text(strip=True)
            if 'Czytaj więcej' in text: continue
            if not text: continue
            
            if p.name == 'h3':
                text_parts.append(f"\n### {text}\n")
            elif p.name == 'h4':
                text_parts.append(f"\n#### {text}\n")
            elif p.name == 'ul':
                for li in p.find_all('li'):
                    text_parts.append(f"* {li.get_text(strip=True)}")
            else:
                text_parts.append(text)
                
        content = "\n\n".join(text_parts)

    if not title:
        print(f"Skipping {url} (no title found)")
        return None

    slug = url.split('/')[-1].replace('.html', '')
    
    return {
        "title": title,
        "date": date,
        "content": content,
        "url": url,
        "slug": slug
    }

def main():
    print("Fetching list of articles...")
    links = fetch_article_links()
    print(f"Found {len(links)} potential article links.")
    
    articles_data = []
    
    for i, link in enumerate(links):
        print(f"Scraping ({i+1}/{len(links)}): {link}")
        data = scrape_article(link)
        if data:
            articles_data.append(data)
        time.sleep(1) # Be polite

    # Sort by likely ID in slug or date if possible, for now just reverse to have newest first if scraped that way
    
    print(f"Successfully scraped {len(articles_data)} articles.")
    
    # Output to JSON
    with open('migrated_articles.json', 'w', encoding='utf-8') as f:
        json.dump(articles_data, f, ensure_ascii=False, indent=2)
    
    print("Saved to migrated_articles.json")

if __name__ == "__main__":
    main()
