import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoProvider,
} from '../interfaces/video-generation.interface';

/** Max seconds to wait between polling attempts. */
const POLL_DELAY_MS = 5_000;

/** Max polling attempts before giving up. */
const MAX_POLL_ATTEMPTS = 12;

@Injectable()
export class KlingVideoProvider implements VideoProvider {
  private readonly logger = new Logger(KlingVideoProvider.name);
  private readonly enabled: boolean;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const enabledValue = this.configService.get<string>('KLING_ENABLED');
    this.enabled = enabledValue?.trim().toLowerCase() === 'true';

    this.apiKey = this.configService.get<string>('KLING_API_KEY') || '';
    this.baseUrl =
      this.configService.get<string>('KLING_API_BASE_URL') ||
      'https://api.klingapi.com';
    this.model =
      this.configService.get<string>('KLING_MODEL') ||
      'kling-v1';
  }

  get name(): string {
    return 'kling';
  }

  isAvailable(): boolean {
    return this.enabled && this.apiKey.length > 0;
  }

  async generate(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Video generation is disabled (KLING_ENABLED is not true)',
        message: 'Video generation is not configured for this environment.',
      };
    }

    if (!this.apiKey) {
      this.logger.warn('Kling API key is not configured (KLING_API_KEY is empty)');
      return {
        success: false,
        error: 'Video generation provider is not configured',
        message: 'Video generation provider is not configured.',
      };
    }

    const prompt = request.contextPrompt
      ? `${request.prompt}\n\nContext: ${request.contextPrompt}`
      : request.prompt;

    const payload: Record<string, unknown> = {
      model: this.model,
      prompt,
      duration: request.duration ?? 5,
      aspect_ratio: (request.aspectRatio ?? '16:9').replace(':', '_'),
    };

    if (request.appearanceReference) {
      payload.reference_image = request.appearanceReference;
      payload.reference_mode = 'character_similarity';
    }

    try {
      this.logger.log(`Creating Kling video task (model=${this.model}, hasReference=${!!request.appearanceReference})`);

      const taskResponse = await this.createTask(payload);

      if (!taskResponse.success || !taskResponse.taskId) {
        return {
          success: false,
          error: taskResponse.error || 'Kling API failed to create task',
          message: taskResponse.message || 'Video generation could not be started.',
        };
      }

      const pollingResult = await this.pollTask(taskResponse.taskId);

      if (!pollingResult.success || !pollingResult.videoUrl) {
        return {
          success: false,
          error: pollingResult.error || 'Video generation task did not complete',
          message: pollingResult.message || 'Video generation timed out or failed.',
        };
      }

      return {
        success: true,
        videoUrl: pollingResult.videoUrl,
        provider: 'kling',
        model: this.model,
        taskId: taskResponse.taskId,
        durationSeconds: request.duration,
      };
    } catch (error: any) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        this.logger.error('Kling API request timed out');
        return {
          success: false,
          error: 'Provider request timed out',
          message: 'Video generation is taking too long. Please try again.',
        };
      }

      this.logger.error(`Kling API network error: ${error.message}`);
      return {
        success: false,
        error: 'Provider unavailable',
        message: 'Video generation service is temporarily unavailable. Please try again later.',
      };
    }
  }

  // ── private helpers ──────────────────────────────────────────────

  private async createTask(
    payload: Record<string, unknown>,
  ): Promise<{ success: boolean; taskId?: string; error?: string; message?: string }> {
    const response = await fetch(`${this.baseUrl}/v1/videos/text2video`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      const status = response.status;
      this.logger.error(`Kling task creation error (status=${status}) — body redacted`);
      return {
        success: false,
        error: `Kling API returned status ${status}`,
        message: 'Video generation could not be started.',
      };
    }

    const data = await response.json();

    const taskId: string | undefined =
      data?.data?.task_id ||
      data?.task_id ||
      undefined;

    if (!taskId) {
      this.logger.error('Kling API returned success but no task_id in payload');
      return {
        success: false,
        error: 'Kling API returned no task_id',
        message: 'Video generation could not be started.',
      };
    }

    return { success: true, taskId };
  }

  private async pollTask(
    taskId: string,
  ): Promise<{ success: boolean; videoUrl?: string; error?: string; message?: string }> {
    for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
      await this.sleep(POLL_DELAY_MS);

      const response = await fetch(`${this.baseUrl}/v1/videos/${taskId}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        this.logger.error(`Kling task polling error (status=${response.status}, attempt=${attempt}) — body redacted`);
        return {
          success: false,
          error: `Kling API returned status ${response.status} on poll`,
          message: 'Video generation failed during processing.',
        };
      }

      const data = await response.json();

      const status: string | undefined =
        data?.data?.task_status ||
        data?.data?.status ||
        data?.status ||
        undefined;

      if (status === 'succeed' || status === 'completed') {
        const videoUrl: string | undefined =
          data?.data?.task_result?.videos?.[0]?.url ||
          data?.data?.videos?.[0]?.url ||
          undefined;

        if (!videoUrl) {
          this.logger.error('Kling task completed but no video URL in payload');
          return {
            success: false,
            error: 'Task completed but no video URL returned',
          };
        }

        this.logger.log(`Kling task ${taskId} completed on attempt ${attempt}`);
        return { success: true, videoUrl };
      }

      if (status === 'failed') {
        this.logger.error(`Kling task ${taskId} failed`);
        return {
          success: false,
          error: 'Video generation task failed',
          message: 'The video generation task did not complete successfully.',
        };
      }

      this.logger.log(`Kling task ${taskId} status=${status}, attempt=${attempt}/${MAX_POLL_ATTEMPTS}`);
    }

    this.logger.error(`Kling task ${taskId} timed out after ${MAX_POLL_ATTEMPTS} polling attempts`);
    return {
      success: false,
      error: 'Video generation timed out',
      message: 'Video generation is taking longer than expected. Please try again.',
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
