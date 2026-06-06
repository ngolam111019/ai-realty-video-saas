// services/video-processor/src/processors/draft-saver.test.ts
import { updateDraftProgress, saveDraftSuccess, saveDraftFailure } from './draft-saver';
import { db } from '../lib/db';

jest.mock('../lib/db', () => ({
  db: {
    scriptDraft: {
      update: jest.fn(),
    },
  },
}));

describe('draft-saver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('TC-01: Cập nhật tiến trình draft', async () => {
    (db.scriptDraft.update as jest.Mock).mockResolvedValueOnce({});

    await updateDraftProgress({
      draftId: 'd1',
      progress: 30,
      currentStep: 'MEDIA_DOWNLOAD',
    });

    expect(db.scriptDraft.update).toHaveBeenCalledWith({
      where: { id: 'd1' },
      data: {
        progress: 30,
        currentStep: 'MEDIA_DOWNLOAD',
      },
    });
  });

  test('TC-02: Lưu thành công kịch bản draft', async () => {
    (db.scriptDraft.update as jest.Mock).mockResolvedValueOnce({});

    const mockScript = {
      title: 'Nhà Đẹp Bình Thạnh',
      scenes: [],
      suggestedCaption: 'Bán nhà...',
      suggestedHashtags: ['binhthanh'],
    };

    await saveDraftSuccess({
      draftId: 'd2',
      script: mockScript,
    });

    expect(db.scriptDraft.update).toHaveBeenCalledWith({
      where: { id: 'd2' },
      data: {
        status: 'READY',
        progress: 100,
        currentStep: 'COMPLETED',
        title: 'Nhà Đẹp Bình Thạnh',
        scenes: [],
        suggestedCaption: 'Bán nhà...',
        suggestedHashtags: ['binhthanh'],
        errorMessage: null,
        failedStep: null,
      },
    });
  });

  test('TC-03: Lưu thất bại kịch bản draft', async () => {
    (db.scriptDraft.update as jest.Mock).mockResolvedValueOnce({});

    await saveDraftFailure({
      draftId: 'd3',
      errorMessage: 'Lỗi API Gemini',
      failedStep: 'SCRIPT_GENERATION',
    });

    expect(db.scriptDraft.update).toHaveBeenCalledWith({
      where: { id: 'd3' },
      data: {
        status: 'FAILED',
        errorMessage: 'Lỗi API Gemini',
        failedStep: 'SCRIPT_GENERATION',
      },
    });
  });
});
