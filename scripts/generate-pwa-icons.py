"""Regenerate installable-app icons / favicons.

Prefer high-quality masters from tmp-icons/deephouselabicons when present;
otherwise fall back to public/DeepHouseLabLogo.png.

Run with: python3 scripts/generate-pwa-icons.py

Maskable icons are inset to 80% so Android can crop them without cutting the logo.
"""

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
ICON_PACK = ROOT / "tmp-icons" / "deephouselabicons"
MASKABLE_SAFE_ZONE = 0.8
MASKABLE_BG = (20, 20, 20)  # matches Android adaptive #141414
APP_BG = (7, 9, 15)


def pick_master():
    candidates = [
        ICON_PACK / "ios" / "iTunesArtwork@3x.png",
        ICON_PACK / "ios" / "AppIcon.appiconset" / "ItunesArtwork@2x.png",
        ICON_PACK / "ios" / "iTunesArtwork@2x.png",
        ICON_PACK / "android" / "playstore-icon.png",
        PUBLIC / "DeepHouseLabLogo.png",
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError("No icon master found")


def square(image):
    side = min(image.size)
    left = (image.width - side) // 2
    top = (image.height - side) // 2
    return image.crop((left, top, left + side, top + side))


def to_rgb(img, bg=APP_BG):
    canvas = Image.new("RGBA", img.size, (*bg, 255))
    canvas.alpha_composite(img.convert("RGBA"))
    return canvas.convert("RGB")


def render(source, size, inset=1.0, bg=None):
    background = bg if bg is not None else source.getpixel((0, 0))[:3]
    if len(background) == 4:
        background = background[:3]
    canvas = Image.new("RGB", (size, size), background)
    logo = source.resize((round(size * inset), round(size * inset)), Image.LANCZOS).convert("RGBA")
    layer = Image.new("RGBA", (size, size), (*background, 255))
    ox = (size - logo.width) // 2
    oy = (size - logo.height) // 2
    layer.alpha_composite(logo, (ox, oy))
    return layer.convert("RGB")


def main():
    master_path = pick_master()
    print(f"master: {master_path}")
    master = square(Image.open(master_path).convert("RGBA"))

    android_192 = ICON_PACK / "android" / "mipmap-xxxhdpi" / "ic_launcher.png"
    playstore = ICON_PACK / "android" / "playstore-icon.png"
    apple_180 = ICON_PACK / "ios" / "AppIcon.appiconset" / "Icon-App-60x60@3x.png"

    if android_192.is_file():
        to_rgb(Image.open(android_192)).save(PUBLIC / "pwa-icon-192.png", "PNG", optimize=True)
        print("wrote pwa-icon-192.png (android xxxhdpi)")
    else:
        render(master, 192, 1.0).save(PUBLIC / "pwa-icon-192.png", "PNG", optimize=True)
        print("wrote pwa-icon-192.png")

    if playstore.is_file():
        to_rgb(Image.open(playstore)).save(PUBLIC / "pwa-icon-512.png", "PNG", optimize=True)
        print("wrote pwa-icon-512.png (playstore)")
    else:
        render(master, 512, 1.0).save(PUBLIC / "pwa-icon-512.png", "PNG", optimize=True)
        print("wrote pwa-icon-512.png")

    render(master, 192, MASKABLE_SAFE_ZONE, bg=MASKABLE_BG).save(
        PUBLIC / "pwa-icon-maskable-192.png", "PNG", optimize=True
    )
    render(master, 512, MASKABLE_SAFE_ZONE, bg=MASKABLE_BG).save(
        PUBLIC / "pwa-icon-maskable-512.png", "PNG", optimize=True
    )
    print("wrote maskable icons")

    if apple_180.is_file():
        to_rgb(Image.open(apple_180)).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
        print("wrote apple-touch-icon.png (ios 60@3x)")
    else:
        render(master, 180, 1.0).save(PUBLIC / "apple-touch-icon.png", "PNG", optimize=True)
        print("wrote apple-touch-icon.png")

    for name, size in (("favicon-16x16.png", 16), ("favicon-32x32.png", 32), ("favicon.png", 32)):
        render(master, size, 1.0).save(PUBLIC / name, "PNG", optimize=True)
        print(f"wrote {name}")


if __name__ == "__main__":
    main()
