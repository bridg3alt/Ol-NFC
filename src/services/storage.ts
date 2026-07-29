// Olvia - voice prompt audio encoding
//
// Recordings are stored inline in their Firestore document as a data URL
// rather than in Firebase Storage, which requires a paid Blaze plan. A short
// spoken reminder encodes to a few tens of KB, comfortably inside Firestore's
// 1 MiB per-document ceiling, so the free tier covers the whole feature.

/** Firestore caps a document at 1 MiB; leave room for the rest of the fields. */
const MAX_AUDIO_BYTES = 700 * 1024;

/** Roughly how long a clip can run before it risks exceeding that ceiling. */
export const MAX_RECORDING_SECONDS = 20;

export class RecordingTooLargeError extends Error {
  constructor(actualBytes: number) {
    super(
      `Recording is ${Math.round(actualBytes / 1024)} KB, over the ` +
        `${Math.round(MAX_AUDIO_BYTES / 1024)} KB limit. ` +
        `Record a shorter prompt (under ${MAX_RECORDING_SECONDS} seconds).`
    );
    this.name = 'RecordingTooLargeError';
  }
}

/**
 * Converts a recorded blob into a data URL for inline storage.
 * Throws RecordingTooLargeError if the encoded result would not fit.
 */
export async function encodeVoicePrompt(blob: Blob): Promise<string> {
  // Base64 inflates by about a third; check before spending work on encoding.
  const projectedSize = Math.ceil(blob.size * 1.37);
  if (projectedSize > MAX_AUDIO_BYTES) {
    throw new RecordingTooLargeError(projectedSize);
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Could not read recording'));
    reader.readAsDataURL(blob);
  });

  if (dataUrl.length > MAX_AUDIO_BYTES) {
    throw new RecordingTooLargeError(dataUrl.length);
  }

  return dataUrl;
}
