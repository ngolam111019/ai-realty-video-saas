// services/video-processor/src/processors/tts-fpt.test.ts
import { generateTtsFpt } from './tts-fpt';
import axios from 'axios';
import * as fs from 'fs';

jest.mock('axios');
jest.mock('fs', () => ({
  createWriteStream: jest.fn(),
}));
jest.mock('fs/promises', () => ({
  mkdir: jest.fn(),
}));

describe('tts-fpt', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, FPT_API_KEY: 'mock-fpt-key' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('TC-01: Calls FPT.AI TTS successfully, polls, and downloads the file', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        async: 'https://cdn.fpt.ai/audio/123.mp3',
      },
    });

    (axios.head as jest.Mock).mockResolvedValueOnce({
      status: 200,
    });

    const mockStream = {
      pipe: jest.fn(),
    };

    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: mockStream,
    });

    const mockWriter = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'finish') {
          process.nextTick(callback);
        }
        return mockWriter;
      }),
    };
    (fs.createWriteStream as jest.Mock).mockReturnValueOnce(mockWriter);

    const result = await generateTtsFpt({
      text: 'Xin chào',
      voice: 'lannhi',
      localOutputPath: '/tmp/test-fpt.mp3',
    });

    expect(result).toBe('/tmp/test-fpt.mp3');
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.fpt.ai/hmi/tts/v5',
      'Xin chào',
      expect.objectContaining({
        headers: {
          api_key: 'mock-fpt-key',
          voice: 'lannhi',
          speed: '0',
          'Content-Type': 'text/plain',
        },
      }),
    );
    expect(axios.head).toHaveBeenCalledWith('https://cdn.fpt.ai/audio/123.mp3');
    expect(axios.get).toHaveBeenCalledWith('https://cdn.fpt.ai/audio/123.mp3', {
      responseType: 'stream',
    });
  });

  test('TC-02: Throws error if FPT API returns error', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        success: 'false',
        message: 'Invalid key',
      },
    });

    await expect(
      generateTtsFpt({
        text: 'Xin chào',
        voice: 'lannhi',
        localOutputPath: '/tmp/test-fpt.mp3',
      }),
    ).rejects.toThrow('FPT.AI TTS API error: Invalid key');
  });
});
