import { BOARD_PREVIEW_DISCLOSURE } from '../lib/generationPresentation';

export default function BoardPreviewDisclosure({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-right text-sm font-bold leading-7 text-amber-800"
    >
      {BOARD_PREVIEW_DISCLOSURE}
    </div>
  );
}
