/**
 * The audio direction, in numbers.
 *
 * A quiet antique library: soft paper, leather, a muted brass clasp, wood, and a room that is barely there.
 * Nothing here is a UI sound. Every sound is something the book could make, kept low and kept short, and the
 * default levels are chosen so that people think "that is nice" and not "what was that".
 *
 * Volumes are three independent dials (master, effects, ambience) plus an on/off switch. Components never set
 * a volume of their own: they ask the AudioManager for a named sound and it decides how loud that is.
 */

export const AUDIO_CONFIG = {
  masterVolume: 0.35,
  sfxVolume: 0.25,
  ambientVolume: 0.12,
} as const;

/**
 * The three dials are slider positions, not raw gains. This is the one fixed lift between them and the speaker
 * (about +9.5 dB), so that master 0.35 × effects 0.25 lands quiet but audible rather than inaudible.
 */
export const OUTPUT_TRIM = 3;

/** The sounds a timeline marker or a component can ask for by name. */
export type SoundName = "flip" | "open" | "close" | "shelf" | "pull" | "clasp" | "detent" | "paper";

/**
 * Every effect is rendered once into a buffer and brought to the same perceived loudness (TARGET_RMS_DB, measured
 * the way a small speaker hears it, without the lowest octaves), with its peak held at PEAK_CAP_DB. The numbers
 * here are then only how much quieter one sound sits than another: they are all at or below 1, chosen from the measured level of each rendered sound (see README, “Checking the sound”).
 */
export const TARGET_RMS_DB = -9;
export const PEAK_CAP_DB = -3;

export const LEVEL: Record<SoundName | "voice", number> = {
  flip: 0.54,
  open: 0.7,
  close: 0.63,
  shelf: 0.63,
  pull: 0.5,
  clasp: 0.8,
  detent: 0.5,
  paper: 0.45,
  voice: 0.5,
};

/** How many differently-made takes of each sound there are (a page is never turned the same way twice). */
export const VARIANTS: Record<SoundName, number> = {
  flip: 6,
  open: 3,
  close: 3,
  shelf: 4,
  pull: 3,
  clasp: 3,
  detent: 3,
  paper: 4,
};

/** The least time (ms) between two of the same sound, and how much quieter a sound is when it comes soon after the last. */
export const GAP: Record<SoundName | "voice", { min: number; soon: number }> = {
  flip: { min: 140, soon: 380 },
  open: { min: 400, soon: 0 },
  close: { min: 400, soon: 0 },
  shelf: { min: 260, soon: 600 },
  pull: { min: 260, soon: 600 },
  clasp: { min: 120, soon: 0 },
  detent: { min: 200, soon: 0 },
  paper: { min: 300, soon: 700 },
  voice: { min: 900, soon: 0 },
};

/** Sound is off until asked for by anyone who has asked their system for less motion. */
export const STORAGE_KEY = "book-portfolio:audio:v2";
