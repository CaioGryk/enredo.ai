export interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: 'cinematic' | 'animated' | 'realistic';
  /** Optional narrative/session context for prompt enrichment. Never contains user PII. */
  contextPrompt?: string;
  /**
   * Appearance/likeness reference image URL. Only included when
   * the user has explicitly opted in (`userAppearanceOptIn === true`) and
   * a valid profile photo exists.  Never a face-swap — it is a visual
   * consistency reference for the generated video.
   *
   * Provider boundary only: backend lookup is deferred until profile
   * photo / opt-in persistence contracts are implemented.
   */
  appearanceReference?: string;
  /** Human-readable provider model identifier (e.g. "kling-v1-5"). */
  model?: string;
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  provider?: string;
  error?: string;
  message?: string;
  /** Provider model identifier (e.g. "kling-v1-5"). Safe for metadata. */
  model?: string;
  /** Async task identifier from the provider. Not exposed to clients. */
  taskId?: string;
  /** Video duration in seconds, if known. */
  durationSeconds?: number;
}

export interface VideoProvider {
  name: string;
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  isAvailable(): boolean;
}
