from PIL import Image
import os

def split_image(filename_base):
    # Try JPG first, then PNG
    input_path = f"public/{filename_base}_raw.jpg"
    if not os.path.exists(input_path):
        input_path = f"public/{filename_base}_raw.png"
    
    before_path = f"public/{filename_base}_before.jpg"
    after_path = f"public/{filename_base}_after.jpg"

    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} not found.")
        return

    try:
        img = Image.open(input_path)
        # Convert to RGB if needed (e.g. from RGBA PNG)
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
            
        width, height = img.size
        print(f"Processing {filename_base}: {width}x{height}")

        midpoint = width // 2

        # Crop Before (Left side)
        img_before = img.crop((0, 0, midpoint, height))
        img_before.save(before_path)
        print(f"Saved {before_path}")

        # Crop After (Right side)
        img_after = img.crop((midpoint, 0, width, height))
        img_after.save(after_path)
        print(f"Saved {after_path}")

    except Exception as e:
        print(f"Error processing {filename_base}: {e}")

if __name__ == "__main__":
    # split_image("metamorphosis") 
    # split_image("metamorphosis_2")
    split_image("metamorphosis_3")
