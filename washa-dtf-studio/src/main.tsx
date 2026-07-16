import {ClerkProvider} from '@clerk/clerk-react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY.trim();
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(
  clerkPublishableKey
    ? <ClerkProvider publishableKey={clerkPublishableKey}>{app}</ClerkProvider>
    : (
      <main className="grid min-h-screen place-items-center bg-[#f8f5ee] px-6 text-center text-[#2b2118]">
        <div>
          <h1 className="text-xl font-bold">تعذّر تشغيل تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-[#6f6257]">إعداد Clerk العام غير متاح في هذه النسخة.</p>
        </div>
      </main>
    ),
);
