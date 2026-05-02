/**
 * Rough BPM estimate from an AudioBuffer using onset-energy autocorrelation.
 * Not studio-grade; good enough for sync hints in the browser.
 */
export function estimateBpmFromBuffer(audioBuffer) {
  const ch0 = audioBuffer.getChannelData(0);
  const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
  const len = ch0.length;
  const sampleRate = audioBuffer.sampleRate;

  const hop = 512;
  const frames = Math.floor(len / hop);
  if (frames < 32) return { bpm: 120, confidence: 0 };

  const env = new Float32Array(frames);
  let prev = 0;
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    const start = i * hop;
    const end = Math.min(start + hop, len);
    for (let j = start; j < end; j++) {
      const m = ch1 ? (ch0[j] + ch1[j]) * 0.5 : ch0[j];
      sum += m * m;
    }
    const e = Math.sqrt(sum / (end - start));
    const diff = Math.max(0, e - prev);
    env[i] = diff;
    prev = e * 0.97;
  }

  let mean = 0;
  for (let i = 0; i < frames; i++) mean += env[i];
  mean /= frames;
  let varSum = 0;
  for (let i = 0; i < frames; i++) {
    const d = env[i] - mean;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / frames) || 1;
  for (let i = 0; i < frames; i++) {
    env[i] = (env[i] - mean) / std;
  }

  const minBpm = 70;
  const maxBpm = 180;
  const minLag = Math.floor((60 / maxBpm) * (sampleRate / hop));
  const maxLag = Math.ceil((60 / minBpm) * (sampleRate / hop));

  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag && lag < frames / 2; lag++) {
    let acc = 0;
    for (let i = lag; i < frames; i++) acc += env[i] * env[i - lag];
    if (acc > bestScore) {
      bestScore = acc;
      bestLag = lag;
    }
  }

  const bpmRaw = (60 * sampleRate) / (hop * bestLag);
  let bpm = bpmRaw;
  while (bpm < minBpm) bpm *= 2;
  while (bpm > maxBpm) bpm /= 2;
  bpm = Math.round(bpm * 10) / 10;

  const confidence = Math.min(1, Math.max(0, bestScore / (frames * 0.15)));

  return { bpm, confidence };
}
