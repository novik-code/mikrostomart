from PIL import Image
import os

def split_image(filename_base):
    input_path = f"public/{filename_base}_raw.jpg"
    before_path = f"public/{filename_base}_before.jpg"
    after_path = f"public/{filename_base}_after.jpg"

    if not os.path.exists(input_path):
        print(f"Error: Input file {input_path} not found.")
        return

    try:
        img = Image.open(input_path)
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
    split_image("metamorphosis") # Re-process 1 just in case or skip
    split_image("metamorphosis_2")
