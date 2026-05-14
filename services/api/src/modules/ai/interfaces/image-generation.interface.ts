export interface ImageGenerationRequest {
  prompt: string;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  seed?: number;
  style?: 'photorealistic' | 'digital-art' | 'cinematic' | 'illustrated';
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  base64Image?: string;
  prompt?: string;
  provider?: string;
  error?: string;
}

export interface ImageProvider {
  name: string;
  generate(request: ImageGenerationRequest): Promise<ImageGenerationResponse>;
  isAvailable(): boolean;
}
