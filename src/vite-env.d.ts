/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional override for where the AIS snapshot is loaded from. */
  readonly VITE_AIS_SNAPSHOT_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
