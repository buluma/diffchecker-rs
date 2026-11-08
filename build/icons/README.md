# Dock icon

`diffchecker.png` is the 1024px transparent source. `diffchecker.icns` contains
the standard macOS icon sizes, generated with `sips` and `iconutil`. Tauri
packages `src-tauri/icons/icon.icns` instead, so regenerate that file when the
artwork changes.

Artwork generated using the built-in imagegen tool with this prompt:

> Use case: logo-brand. Create a polished macOS Dock app icon for a developer
> text comparison app named Diffchecker. Single centered rounded-square dark
> indigo tile, subtle tactile satin depth and finely beveled edges. Main symbol:
> two side-by-side ivory document panels with three thick horizontal lines each;
> one changed line coral red on the left and mint green on the right. A narrow
> central gap emphasizes comparison. Bold simple geometry legible at 32px,
> restrained premium native macOS appearance, very slight dimensionality,
> front-on orthographic. No text, letters, watermark, extra objects or mockup.
> Icon tile fills about 82% of square canvas, equal padding; genuinely
> transparent canvas outside rounded tile and subtle shadow. Output 1024x1024.
