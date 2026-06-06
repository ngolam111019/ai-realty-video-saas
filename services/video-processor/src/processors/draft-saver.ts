// services/video-processor/src/processors/draft-saver.ts
import { db } from '../lib/db';
import { GeneratedScript } from '../types';

export interface UpdateDraftProgressInput {
  draftId: string;
  progress: number;
  currentStep: string;
}

export interface SaveDraftSuccessInput {
  draftId: string;
  script: GeneratedScript;
}

export interface SaveDraftFailureInput {
  draftId: string;
  errorMessage: string;
  failedStep: string;
}

export async function updateDraftProgress(input: UpdateDraftProgressInput): Promise<void> {
  await db.scriptDraft.update({
    where: { id: input.draftId },
    data: {
      progress: input.progress,
      currentStep: input.currentStep,
    },
  });
}

export async function saveDraftSuccess(input: SaveDraftSuccessInput): Promise<void> {
  await db.scriptDraft.update({
    where: { id: input.draftId },
    data: {
      status: 'READY',
      progress: 100,
      currentStep: 'COMPLETED',
      title: input.script.title,
      scenes: input.script.scenes as any,
      suggestedCaption: input.script.suggestedCaption,
      suggestedHashtags: input.script.suggestedHashtags,
      errorMessage: null,
      failedStep: null,
    },
  });
}

export async function saveDraftFailure(input: SaveDraftFailureInput): Promise<void> {
  await db.scriptDraft.update({
    where: { id: input.draftId },
    data: {
      status: 'FAILED',
      errorMessage: input.errorMessage,
      failedStep: input.failedStep,
    },
  });
}
