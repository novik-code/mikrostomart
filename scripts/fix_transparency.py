
from PIL import Image
import sys
import os

def remove_checkerboard(image_path):
    try:
        img = Image.open(image_path)
        img = img.convert("RGBA")
        datas = img.getdata()

        newData = []
        # Checkerboard usually consists of white and light gray squares.
        # Let's target commonly generated checkerboard colors.
        # Often it's #FFFFFF (255, 255, 255) and #C0C0C0 (192, 192, 192) or similar.
        # We'll use a threshold or specific color targeting.
        
        # Heuristic: If a pixel is white or light gray, make it transparent.
        # This is risky if the doctor has white clothes.
        # Better heuristic: Flood fill from corners? 
        # The generated images (from previous artifacts) look like the subject is central.
        # Let's try to detect the background color from the top-left corner.
        
        corner_pixel = img.getpixel((0, 0))
        
        # Let's just try to mask out the specific "checkerboard" pattern if possible, 
        # but since that's hard, let's try a color keying approach for now.
        # Looking at the user screenshot, it's a distinct gray/white pattern.
        
        for item in datas:
            # Check for White
            if item[0] > 240 and item[1] > 240 and item[2] > 240: 
                newData.append((255, 255, 255, 0))
            # Check for Light Gray (checkerboard dark square)
            # Usually around 204 (0xCC) or 192 (0xC0) or similar visually
            elif item[0] in range(150, 220) and item[1] in range(150, 220) and item[2] in range(150, 220) and abs(item[0]-item[1]) < 10:
                 newData.append((255, 255, 255, 0))
            else:
                newData.append(item)

        img.putdata(newData)
        
        # Save overwriting
        img.save(image_path, "PNG")
        print(f"Processed {image_path}")
        
    except Exception as e:
        print(f"Error processing {image_path}: {e}")

if __name__ == "__main__":
    files = [
        "public/images/doctor-cutout-1.png",
        "public/images/doctor-cutout-2.png",
        "public/images/doctor-cutout-3.png"
    ]
    
    for f in files:
        if os.path.exists(f):
            remove_checkerboard(f)
        else:
            print(f"File not found: {f}")
