import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { DesignProvider, useDesign } from './context/DesignContext';
import { useDesignHistory } from './hooks/useDesignHistory';
import Header from './components/Header';
import StepGarment from './components/steps/StepGarment';
import StepIdea from './components/steps/StepIdea';
import StepStyle from './components/steps/StepStyle';
import StepResult from './components/steps/StepResult';
import SplashScreen from './components/SplashScreen';
import Toast from './components/ui/Toast';
import DesignGallery from './components/DesignGallery';
import ErrorBoundary from './components/ErrorBoundary';

function AppContent() {
  const { step, mockupImage, isGenerating, state } = useDesign();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const { history, saveDesign, deleteDesign, clearHistory } = useDesignHistory();

  // Auto-save when mockup is generated
  const prevMockupRef = useState<string | null>(null);
  if (mockupImage && !isGenerating && mockupImage !== prevMockupRef[0]) {
    prevMockupRef[1](mockupImage);
    saveDesign({
      garmentType: state.garmentType,
      garmentColor: state.garmentColor,
      style: state.style,
      technique: state.technique,
      palette: state.palette,
      prompt: state.prompt,
      thumbnail: mockupImage,
    });
  }

  return (
    <div className="min-h-screen bg-washa-bg text-washa-text font-sans selection:bg-washa-gold selection:text-washa-bg bg-grid-pattern relative overflow-hidden">
      {/* Ambient Background Orbs */}
      <div className="ambient-orb ambient-orb-1" />
      <div className="ambient-orb ambient-orb-2" />
      <div className="ambient-orb ambient-orb-3" />

      <Header onOpenGallery={() => setGalleryOpen(true)} />

      {/* Full-Screen Wizard — centered, no side panel */}
      <main className="wizard-step-container">
        <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
          <AnimatePresence mode="wait">
            {step === 1 && <StepGarment key="step-garment" />}
            {step === 2 && <StepIdea key="step-idea" />}
            {step === 3 && <StepStyle key="step-style" />}
            {step === 4 && <StepResult key="step-result" />}
          </AnimatePresence>
        </div>
      </main>

      <Toast />
      <DesignGallery
        isOpen={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        history={history}
        onDelete={deleteDesign}
        onClear={clearHistory}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <DesignProvider>
        <SplashScreen />
        <AppContent />
      </DesignProvider>
    </ErrorBoundary>
  );
}
