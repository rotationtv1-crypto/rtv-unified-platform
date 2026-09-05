import { Env } from '../types';

/**
 * RTV Streaming Pipeline - SRS (Simple Realtime Server) integration.
 * Manages the RTMP ingest → transcode → HLS delivery pipeline.
 */

export interface PipelineConfig {
  ingestUrl: string;
  streamKey: string;
  outputs: OutputConfig[];
  srsEnabled: boolean;
}

export interface OutputConfig {
  resolution: '360p' | '480p' | '720p' | '1080p' | '4k';
  bitrate: number;
  codec: 'h264' | 'h265' | 'av1';
}

const DEFAULT_OUTPUTS: OutputConfig[] = [
  { resolution: '360p', bitrate: 800, codec: 'h264' },
  { resolution: '720p', bitrate: 2500, codec: 'h264' },
  { resolution: '1080p', bitrate: 5000, codec: 'h264' },
];

export function buildPipelineConfig(
  streamId: string,
  streamKey: string,
  env: Env
): PipelineConfig {
  return {
    ingestUrl: `rtmp://${env.SRS_INGEST_HOST || 'ingest.rotationtv.live'}/live`,
    streamKey,
    outputs: DEFAULT_OUTPUTS,
    srsEnabled: true,
  };
}

export interface StreamStatus {
  streamId: string;
  status: 'idle' | 'ingesting' | 'transcoding' | 'live' | 'error';
  viewers: number;
  uptime: number;
  bitrate: number;
  fps: number;
}

export async function getStreamStatus(
  streamId: string,
  env: Env
): Promise<StreamStatus | null> {
  const result = await env.DB.prepare(
    `SELECT * FROM active_streams WHERE stream_id = ?`
  )
    .bind(streamId)
    .first<any>();

  if (!result) return null;

  return {
    streamId: result.stream_id,
    status: result.status,
    viewers: result.viewers || 0,
    uptime: Date.now() - new Date(result.started_at).getTime(),
    bitrate: result.bitrate || 0,
    fps: result.fps || 0,
  };
}
