/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional endpoint that receives waitlist sign-ups via POST. */
  readonly VITE_WAITLIST_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
