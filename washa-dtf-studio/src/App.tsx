import { useEffect, useMemo, useRef, useState } from 'react';
import { DesignProvider, useDesign } from './context/DesignContext';
import { useDesignHistory } from './hooks/useDesignHistory';
import Header from './components/Header';
import StepGarment from './components/steps/StepGarment';
import StepIdea from './components/steps/StepIdea';
import StepPosition from './components/steps/StepPosition';
import StepArtStyle from './components/steps/StepArtStyle';
import StepPalette from './components/steps/StepPalette';
import StepResult from './components/steps/StepResult';

// ... other imports
import Toast from './components/ui/Toast';
import DesignGallery from './components/DesignGallery';
import ErrorBoundary from './components/ErrorBoundary';
import { resizeDataUrl } from './lib/image';
import WashaDevStudio from './components/dev/WashaDevStudio';
import WashaDevStudioV2 from './components/dev-v2/WashaDevStudioV2';
import NeuralOrnament from './components/NeuralOrnament';
import EntryBridge from './components/EntryBridge';

type StudioMode = 'production' | 'dev' | 'dev-v2';

function getStudioMode(): StudioMode {
  if (typeof window === 'undefined') return 'production';
  if (window.location.pathname.includes('/design/washa-ai/dev-v2')) {
    return 'dev-v2';
  }
  if (window.location.pathname.includes('/design/washa-ai/dev')) {
    return 'dev';
  }
  return 'production';
}

function AppContent() {
  const { step, mockupImage, isGenerating, state } = useDesign();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { history, saveDesign, deleteDesign, clearHistory } = useDesignHistory();
  const prevMockupRef = useRef<string | null>(null);
  const studioMode = useMemo(() => getStudioMode(), []);

  useEffect(() => {
    if (studioMode !== 'production') return;

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step, studioMode]);

  useEffect(() => {
    let cancelled = false;

    async function persistHistoryThumbnail() {
      if (!mockupImage || isGenerating || mockupImage === prevMockupRef.current) {
        return;
      }

      prevMockupRef.current = mockupImage;

      try {
        const thumbnail = await resizeDataUrl(mockupImage, {
          maxDimension: 320,
          quality: 0.6,
          outputMimeType: 'image/jpeg',
        });

        if (cancelled) return;

        saveDesign({
          garmentType: state.garmentType,
          garmentColor: state.garmentColor,
          style: state.style,
          technique: state.technique,
          palette: state.palette,
          prompt: state.prompt,
          thumbnail: thumbnail.dataUrl,
        });
      } catch (error) {
        console.warn('Failed to prepare history thumbnail:', error);
      }
    }

    void persistHistoryThumbnail();

    return () => {
      cancelled = true;
    };
  }, [
    isGenerating,
    mockupImage,
    saveDesign,
    state.garmentColor,
    state.garmentType,
    state.palette,
    state.prompt,
    state.style,
    state.technique,
  ]);

  return (
    <>
      {studioMode === 'dev-v2' ? (
        <WashaDevStudioV2 onOpenGallery={() => setGalleryOpen(true)} />
      ) : studioMode === 'dev' ? (
        <WashaDevStudio onOpenGallery={() => setGalleryOpen(true)} />
      ) : (
        <div className="min-h-screen bg-washa-bg text-washa-text font-sans selection:bg-washa-gold selection:text-washa-bg bg-grid-pattern relative overflow-x-clip">
          {/* Static neural lattice — visual continuity with the intro */}
          <NeuralOrnament />

          {/* Ambient Background Orbs */}
          <div className="ambient-orb ambient-orb-1" />
          <div className="ambient-orb ambient-orb-2" />
          <div className="ambient-orb ambient-orb-3" />

          <Header onOpenGallery={() => setGalleryOpen(true)} />

          {/* Full-screen wizard, no side panel */}
          <main className="wizard-step-container">
            <div className={`w-full ${step === 3 ? 'max-w-4xl' : 'max-w-[44rem]'} mx-auto px-3 sm:px-5 relative z-10`}>
              {step === 1 && <StepGarment />}
              {step === 2 && <StepIdea />}
              {step === 3 && <StepPosition />}
              {step === 4 && <StepArtStyle />}
              {step === 5 && <StepPalette />}
              {step === 6 && <StepResult />}
            </div>
          </main>
        </div>
      )}

      <Toast />
      <DesignGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        history={history}
        onDelete={deleteDesign}
        onClear={clearHistory}
      />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <EntryBridge />
      <DesignProvider>
        <AppContent />
      </DesignProvider>
    </ErrorBoundary>
  );
}
