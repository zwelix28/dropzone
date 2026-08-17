"""Regenerate the installable-app icons from public/DeepHouseLabLogo.png.

Run with: python3 scripts/generate-pwa-icons.py

Maskable icons are inset to 80% so Android can crop them to a circle or
squircle without cutting into the logo.
"""

from pathlib import Path

from PIL import Image

PUBLIC = Path(__file__).resolve().parent.parent / "public"
SOURCE = PUBLIC / "DeepHouseLabLogo.png"
MASKABLE_SAFE_ZONE = 0.8


def square(image):
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    return image.crop((left, top, left + side, top + side))


def render(source, size, inset=1.0):
    background = source.getpixel((0, 0))[:3]
    canvas = Image.new("RGB", (size, size), background)
    logo_size = round(size * inset)
    canvas.paste(source.resize((logo_size, logo_size), Image.LANCZOS), ((size - logo_size) // 2,) * 2)
    return canvas


def main():
    source = square(Image.open(SOURCE).convert("RGBA"))

    outputs = [
        ("pwa-icon-192.png", 192, 1.0),
        ("pwa-icon-512.png", 512, 1.0),
        ("pwa-icon-maskable-192.png", 192, MASKABLE_SAFE_ZONE),
        ("pwa-icon-maskable-512.png", 512, MASKABLE_SAFE_ZONE),
        ("apple-touch-icon.png", 180, 1.0),
    ]

    for name, size, inset in outputs:
        render(source, size, inset).save(PUBLIC / name, "PNG", optimize=True)
        print(f"wrote {name} ({size}x{size})")


if __name__ == "__main__":
    main()
