export interface SceneConfig {
  key: string;
  label: string;
  title: string;
  description: string;
  accent: string;
  enabled: boolean;
}

export const SCENES: SceneConfig[] = [
  {
    key: 'chat',
    label: 'config.scenes.chat.label',
    title: 'config.scenes.chat.title',
    description: 'config.scenes.chat.description',
    accent: '#4F8EF7',
    enabled: true,
  },
  {
    key: 'call',
    label: 'config.scenes.call.label',
    title: 'config.scenes.call.title',
    description: 'config.scenes.call.description',
    accent: '#10B981',
    enabled: false,
  },
  {
    key: 'live',
    label: 'config.scenes.live.label',
    title: 'config.scenes.live.title',
    description: 'config.scenes.live.description',
    accent: '#F59E0B',
    enabled: true,
  },
  {
    key: 'room',
    label: 'config.scenes.room.label',
    title: 'config.scenes.room.title',
    description: 'config.scenes.room.description',
    accent: '#8B5CF6',
    enabled: false,
  },
];

export const getEnabledScenes = (): SceneConfig[] => SCENES.filter(scene => scene.enabled);

export const getSceneByKey = (key: string): SceneConfig | undefined => SCENES.find(scene => scene.key === key);

export const getDefaultScene = (): SceneConfig => getEnabledScenes()[0] || SCENES[0];

export const isSceneEnabled = (key: string): boolean => {
  const scene = getSceneByKey(key);
  return scene ? scene.enabled : false;
};
