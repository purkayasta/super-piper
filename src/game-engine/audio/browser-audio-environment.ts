import { assetEntry } from '../../content/manifests/asset-manifest';
import type { AudioEnvironment } from './web-audio-engine';

interface ActivationAwareNavigator {
  readonly userActivation?: { readonly hasBeenActive: boolean };
}

interface AudioWindow {
  readonly AudioContext?: typeof AudioContext;
  readonly webkitAudioContext?: typeof AudioContext;
}

export function browserAudioEnvironment(view: Window): AudioEnvironment | null {
  const audioWindow = view as Window & AudioWindow;
  const ContextClass = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
  if (ContextClass === undefined) return null;
  return {
    createContext: () => {
      try {
        return new ContextClass({ latencyHint: 'interactive' });
      } catch {
        return null;
      }
    },
    fetchBytes: async (path) => {
      const response = await view.fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${path}`);
      return response.arrayBuffer();
    },
    soundPath: (id) => assetEntry(id).path,
    hasUserActivation: () =>
      (view.navigator as ActivationAwareNavigator).userActivation?.hasBeenActive === true,
    gestures: view,
    visibility: view.document,
  };
}
