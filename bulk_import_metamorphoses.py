from PIL import Image
import os
import glob

SOURCE_DIR = "/Users/marcinnowosielski/Desktop/metamorfozy"
TARGET_DIR = "public/images/metamorphoses"
START_ID = 4

def setup():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)

def process_images():
    files = glob.glob(os.path.join(SOURCE_DIR, "*"))
    files.sort() # Ensure consistent order
    
    current_id = START_ID
    new_items = []

    print("Checking files...")
    for file_path in files:
        if file_path.lower().endswith(('.jpg', '.jpeg', '.png')):
            try:
                print(f"Processing {os.path.basename(file_path)}...")
                img = Image.open(file_path)
                if img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                
                width, height = img.size
                midpoint = width // 2
                
                # Split
                img_before = img.crop((0, 0, midpoint, height))
                img_after = img.crop((midpoint, 0, width, height))
                
                # Save
                before_name = f"meta_{current_id}_before.jpg"
                after_name = f"meta_{current_id}_after.jpg"
                
                img_before.save(os.path.join(TARGET_DIR, before_name), quality=85)
                img_after.save(os.path.join(TARGET_DIR, after_name), quality=85)
                
                # Generate Data Object
                item = {
                    "id": current_id,
                    "before": f"/images/metamorphoses/{before_name}",
                    "after": f"/images/metamorphoses/{after_name}",
                    "title": f"Metamorfoza {current_id}",
                    "description": "Kompleksowa poprawa estetyki uśmiechu.",
                    "motto": '"Nowy uśmiech, nowe życie."'
                }
                new_items.append(item)
                
                current_id += 1
                
            except Exception as e:
                print(f"Skipping {file_path}: {e}")

    # Output for manual copy-paste
    print("\n--- COPY BELOW INTO src/components/MetamorphosisGallery.tsx ---\n")
    for item in new_items:
        print("    {")
        print(f"        id: {item['id']},")
        print(f"        before: \"{item['before']}\",")
        print(f"        after: \"{item['after']}\",")
        print(f"        title: \"{item['title']}\",")
        print(f"        description: \"{item['description']}\",")
        print(f"        motto: {item['motto']}")
        print("    },")

if __name__ == "__main__":
    setup()
    process_images()
