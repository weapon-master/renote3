// src/react-devtools-core.d.ts
declare module "react-devtools-core" {
  export function connectToDevTools(options?: {
    host?: string;
    port?: number;
  }): void;
}

// Vite environment variables
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}