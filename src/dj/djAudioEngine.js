/** @typedef {'A' | 'B'} DeckId */

function equalPowerCrossfade(t) {
  const x = Math.max(0, Math.min(1, t));
  const a = Math.cos((x * Math.PI) / 2);
  const b = Math.sin((x * Math.PI) / 2);
  return { gainA: a, gainB: b };
}

function makeImpulseResponse(ctx, duration, decay) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }
  }
  return impulse;
}

/**
 * Two-deck Web Audio graph: filters, delay, reverb, flanger, crossfader, master, record tap.
 */
export class DJAudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.master = null;
    /** @type {MediaStreamAudioDestinationNode | null} */
    this.recDest = null;
    /** @type {AnalyserNode | null} */
    this.analyser = null;
    /** @type {Record<string, any>} */
    this.deck = {};
    this.connected = { A: false, B: false };
  }

  async ensureContext() {
    if (!this.ctx) this._buildGraph();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  _buildGraph() {
    const ctx = new AudioContext({ latencyHint: "interactive" });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0.92;

    this.recDest = ctx.createMediaStreamDestination();

    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.analyser.smoothingTimeConstant = 0.65;

    this.master.connect(ctx.destination);
    this.master.connect(this.recDest);
    this.master.connect(this.analyser);

    const xfA = ctx.createGain();
    const xfB = ctx.createGain();
    xfA.gain.value = 1;
    xfB.gain.value = 0;
    xfA.connect(this.master);
    xfB.connect(this.master);
    this.xfA = xfA;
    this.xfB = xfB;
  }

  /**
   * @param {DeckId} id
   * @param {HTMLAudioElement} audio
   */
  connectDeck(id, audio) {
    if (!this.ctx) this._buildGraph();
    if (this.connected[id]) return;

    const ctx = this.ctx;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 20000;
    filter.Q.value = 0.7;

    const filterHP = ctx.createBiquadFilter();
    filterHP.type = "highpass";
    filterHP.frequency.value = 20;
    filterHP.Q.value = 0.7;

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.25;
    const delayDry = ctx.createGain();
    delayDry.gain.value = 1;
    const delayWet = ctx.createGain();
    delayWet.gain.value = 0;
    const delayFb = ctx.createGain();
    delayFb.gain.value = 0;
    const delayMerge = ctx.createGain();

    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulseResponse(ctx, 2.2, 3.2);
    const wetGain = ctx.createGain();
    wetGain.gain.value = 0;
    const dryReverb = ctx.createGain();
    dryReverb.gain.value = 1;

    filterHP.connect(delayDry);
    filterHP.connect(delay);
    delay.connect(delayWet);
    delay.connect(delayFb);
    delayFb.connect(delay);
    delayDry.connect(delayMerge);
    delayWet.connect(delayMerge);

    const postReverb = ctx.createGain();
    postReverb.gain.value = 1;

    const flangeDelay = ctx.createDelay(0.02);
    flangeDelay.delayTime.value = 0.003;
    const flangeDry = ctx.createGain();
    flangeDry.gain.value = 1;
    const flangeWet = ctx.createGain();
    flangeWet.gain.value = 0;
    const flangeOsc = ctx.createOscillator();
    flangeOsc.type = "sine";
    flangeOsc.frequency.value = 0.5;
    const flangeLfoGain = ctx.createGain();
    flangeLfoGain.gain.value = 0.002;
    flangeOsc.connect(flangeLfoGain);
    flangeLfoGain.connect(flangeDelay.delayTime);
    flangeOsc.start();

    const deckVol = ctx.createGain();
    deckVol.gain.value = 1;

    const src = ctx.createMediaElementSource(audio);
    src.connect(filter);
    filter.connect(filterHP);

    delayMerge.connect(dryReverb);
    delayMerge.connect(convolver);
    convolver.connect(wetGain);
    dryReverb.connect(postReverb);
    wetGain.connect(postReverb);
    postReverb.connect(flangeDry);
    postReverb.connect(flangeDelay);
    flangeDelay.connect(flangeWet);
    flangeDry.connect(deckVol);
    flangeWet.connect(deckVol);
    deckVol.connect(id === "A" ? this.xfA : this.xfB);

    this.deck[id] = {
      audio,
      src,
      filter,
      filterHP,
      delay,
      delayDry,
      delayWet,
      delayFb,
      delayMerge,
      convolver,
      wetGain,
      dryReverb,
      flangeDelay,
      flangeDry,
      flangeWet,
      flangeOsc,
      flangeLfoGain,
      postReverb,
      deckVol,
    };

    this.connected[id] = true;
  }

  setCrossfader(t) {
    const { gainA, gainB } = equalPowerCrossfade(t);
    const now = this.ctx.currentTime;
    this.xfA.gain.setTargetAtTime(gainA, now, 0.015);
    this.xfB.gain.setTargetAtTime(gainB, now, 0.015);
  }

  setDeckVolume(id, linear) {
    const d = this.deck[id];
    if (!d) return;
    const v = Math.max(0, Math.min(1, linear));
    d.deckVol.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /**
   * -1 low-pass … 0 neutral … +1 high-pass (DJ filter)
   */
  setFilterMorph(id, morph) {
    const d = this.deck[id];
    if (!d) return;
    const m = Math.max(-1, Math.min(1, morph));
    if (m <= 0) {
      d.filter.type = "lowpass";
      const f = 200 + (1 + m) * (20000 - 200);
      d.filter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
      d.filterHP.frequency.setTargetAtTime(20, this.ctx.currentTime, 0.03);
    } else {
      d.filterHP.type = "highpass";
      const f = 20 + m * (4000 - 20);
      d.filterHP.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
      d.filter.frequency.setTargetAtTime(20000, this.ctx.currentTime, 0.03);
    }
  }

  setEcho(id, wet, time, feedback) {
    const d = this.deck[id];
    if (!d) return;
    const w = Math.max(0, Math.min(1, wet));
    d.delayWet.gain.setTargetAtTime(w * 0.9, this.ctx.currentTime, 0.05);
    d.delayDry.gain.setTargetAtTime(1 - w * 0.55, this.ctx.currentTime, 0.05);
    d.delay.delayTime.setTargetAtTime(0.05 + time * 0.55, this.ctx.currentTime, 0.05);
    d.delayFb.gain.setTargetAtTime(feedback * 0.5, this.ctx.currentTime, 0.05);
  }

  setReverb(id, wet) {
    const d = this.deck[id];
    if (!d) return;
    const w = Math.max(0, Math.min(1, wet));
    d.wetGain.gain.setTargetAtTime(w * 0.55, this.ctx.currentTime, 0.05);
    d.dryReverb.gain.setTargetAtTime(1 - w * 0.35, this.ctx.currentTime, 0.05);
  }

  setFlanger(id, amount) {
    const d = this.deck[id];
    if (!d) return;
    const a = Math.max(0, Math.min(1, amount));
    d.flangeWet.gain.setTargetAtTime(a * 0.75, this.ctx.currentTime, 0.05);
    d.flangeDry.gain.setTargetAtTime(1 - a * 0.35, this.ctx.currentTime, 0.05);
    d.flangeLfoGain.gain.setTargetAtTime(0.001 + a * 0.007, this.ctx.currentTime, 0.05);
  }

  getRecordStream() {
    return this.recDest?.stream ?? null;
  }

  getAnalyser() {
    return this.analyser;
  }

  dispose() {
    try {
      for (const id of ["A", "B"]) {
        const d = this.deck[id];
        if (d?.flangeOsc) d.flangeOsc.stop();
      }
      this.ctx?.close();
    } catch {
      /* ignore */
    }
    this.ctx = null;
    this.connected = { A: false, B: false };
    this.deck = {};
  }
}
