import { ClerkProvider } from '@clerk/clerk-react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import WashaAiV4 from './components/v4/WashaAiV4';
import './v4.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY.trim();
const app = clerkPublishableKey
  ? <ClerkProvider publishableKey={clerkPublishableKey}><WashaAiV4 /></ClerkProvider>
  : (
    <main className="grid min-h-[100dvh] place-items-center bg-[#eee9de] px-6 text-center text-[#292c29]">
      <div>
        <h1 className="text-xl font-black">تعذّر تشغيل WASHA AI v4</h1>
        <p className="mt-2 text-sm text-[#6d706a]">مفتاح تسجيل الدخول العام غير متاح.</p>
      </div>
    </main>
  );

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {app}
  </StrictMode>,
);
