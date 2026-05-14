export interface VideoGenerationRequest {
  prompt: string;
  duration?: number;
  aspectRatio?: '16:9' | '9:16' | '1:1';
  style?: 'cinematic' | 'animated' | 'realistic';
}

export interface VideoGenerationResponse {
  success: boolean;
  videoUrl?: string;
  provider?: string;
  error?: string;
  message?: string;
}

export interface VideoProvider {
  name: string;
  generate(request: VideoGenerationRequest): Promise<VideoGenerationResponse>;
  isAvailable(): boolean;
}
