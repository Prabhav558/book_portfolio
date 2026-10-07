import { AudioManager } from "./manager";

export { AUDIO_CONFIG, type SoundName } from "./config";
export type { Settings } from "./manager";
export { AudioManager };

/** The one AudioManager for the page. */
export const audio = new AudioManager();
