from PIL import Image
import os

def split_image():
    input_path = "public/metamorphosis_raw.jpg"
    before_path = "public/metamorphosis_before.jpg"
    after_path = "public/metamorphosis_after.jpg"

    if not os.path.exists(input_path):
        print("Error: Input file not found.")
        return

    try:
        img = Image.open(input_path)
        width, height = img.size
        print(f"Original size: {width}x{height}")

        # Assuming the image is a side-by-side comparison (Before | After)
        # We split it vertically in the middle.
        midpoint = width // 2

        # Crop Before (Left side)
        img_before = img.crop((0, 0, midpoint, height))
        img_before.save(before_path)
        print(f"Saved Before image to {before_path}")

        # Crop After (Right side)
        img_after = img.crop((midpoint, 0, width, height))
        img_after.save(after_path)
        print(f"Saved After image to {after_path}")

    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    split_image()
