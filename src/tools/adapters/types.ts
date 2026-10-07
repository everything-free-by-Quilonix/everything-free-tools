/**
 * Universal Tool Adapter Types.
 *
 * Provides standard interfaces for client engines, open-source library wrappers,
 * and external service fallbacks.
 */

export interface ExternalServiceAdapter {
  id: string;
  name: string;
  provider: string;
  serviceUrl: string;
  privacyNotice: string;
  freeTier: boolean;
  requiresUpload: boolean;
  limitsDescription?: string;
}

export interface EngineAdapter<TInput, TOutput> {
  id: string;
  version: string;
  execute: (input: TInput) => Promise<TOutput>;
}
