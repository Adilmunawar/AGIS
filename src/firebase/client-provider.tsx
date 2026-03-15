'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { areFirebaseConfigVarsPresent } from '@/firebase/config';
import { ShieldX } from 'lucide-react';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * A component that displays a user-friendly error message when Firebase configuration is missing.
 */
const MissingConfigError = () => (
  <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
    <div className="w-full max-w-2xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-6">
        <ShieldX className="h-8 w-8 text-destructive" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Application Not Configured</h1>
      <p className="mt-2 text-md text-muted-foreground">
        This application cannot start because it is missing essential configuration keys for services like Firebase and Google Earth Engine.
      </p>
      <div className="mt-6 text-left bg-muted/50 p-6 rounded-lg border">
        <h2 className="text-lg font-semibold text-foreground mb-3">How to Fix</h2>
        <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
          <li>Locate or create a file named <strong><code>.env.local</code></strong> in the root directory of your project.</li>
          <li>
            Open the <strong><code>.env</code></strong> file to see a template of all required variables.
          </li>
          <li>
            Copy the variables into your <strong><code>.env.local</code></strong> file and fill in the correct values for your project. You can find these in your Firebase project settings and Google Cloud console.
          </li>
          <li>
            Ensure your <strong><code>EE_BASE64_KEY</code></strong> for Google Earth Engine is correctly set. This is a critical and sensitive key.
          </li>
          <li>After adding the keys, <strong>restart your development server</strong> for the changes to take effect.</li>
        </ol>
      </div>
       <p className="mt-6 text-xs text-muted-foreground">
        Note: The <code>.env.local</code> file is ignored by Git and should never be committed to a public repository.
      </p>
    </div>
  </div>
);


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const isConfigPresent = areFirebaseConfigVarsPresent();

  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, only if config is present.
    if (!isConfigPresent) return null;
    return initializeFirebase();
  }, [isConfigPresent]); 

  // The GEE check relies on a server-side environment variable, so we add a check here.
  // We assume if the public Firebase keys are missing, the GEE key is likely missing too.
  if (!isConfigPresent) {
    return <MissingConfigError />;
  }
  
  if (!firebaseServices) {
    // This case might occur if initialization fails for other reasons.
     return <MissingConfigError />;
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
