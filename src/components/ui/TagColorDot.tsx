import { tagColor } from '@/lib/nfcTags';

/** A swatch of the sticker colour, always followed by its name in text. */
export function TagColorDot({ color }: { color: string }) {
  const { name, hex } = tagColor(color);
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="w-5 h-5 rounded-full border-2 border-stone-400"
        style={{ backgroundColor: hex }}
      />
      <span>{name} tag</span>
    </span>
  );
}
