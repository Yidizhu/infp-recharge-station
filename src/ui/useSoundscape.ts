import { useEffect, useRef, useState } from 'react';

export type Music = 'off' | 'day' | 'night';
export type Ambience = 'off' | 'river' | 'leaves' | 'birds';
type Channel = 'music' | 'ambient' | 'reward';
type Status = 'quiet' | 'loading' | 'playing' | 'paused' | 'error';
export interface SoundReward { recordId: string; total: number }

/** Media is created only after an explicit play action. No audio is fetched at mount. */
export function useSoundscape(reward?: SoundReward | null) {
  const [music, setMusic] = useState<Music>('day');
  const [ambient, setAmbient] = useState<Ambience>('river');
  const [musicVolume, setMusicVolume] = useState(25);
  const [ambientVolume, setAmbientVolume] = useState(35);
  const [effects, setEffects] = useState(false);
  const [status, setStatus] = useState<Status>('quiet');
  const audio = useRef<Partial<Record<Channel, HTMLAudioElement>>>({});
  const active = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const rewardTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const seen = useRef(new Set<string>());

  function release(channel: Channel) {
    const element = audio.current[channel];
    if (element) { element.onerror = null; element.pause(); element.removeAttribute('src'); element.load(); delete audio.current[channel]; }
    if (channel === 'reward' && rewardTimer.current !== null) { clearInterval(rewardTimer.current); rewardTimer.current = null; }
  }
  function stop(next: Status = 'paused') {
    generation.current += 1;
    active.current = false;
    release('music'); release('ambient'); release('reward');
    if (alive.current) setStatus(next);
  }
  function create(channel: Channel, path: string, volume: number) {
    const element = new Audio();
    element.preload = 'none'; element.loop = channel !== 'reward'; element.volume = volume / 100;
    element.src = `/audio/${path}.mp3`;
    audio.current[channel] = element;
    return element;
  }
  function play(nextMusic = music, nextAmbient = ambient) {
    stop('quiet');
    if (document.hidden || (nextMusic === 'off' && nextAmbient === 'off' && !effects)) return;
    active.current = true;
    const ticket = generation.current;
    setStatus('loading');
    const elements: HTMLAudioElement[] = [];
    if (nextMusic !== 'off') elements.push(create('music', `music-garden-${nextMusic}`, musicVolume));
    if (nextAmbient !== 'off') elements.push(create('ambient', `ambient-${nextAmbient}-loop`, ambientVolume));
    const fail = () => { if (alive.current && generation.current === ticket) stop('error'); };
    for (const element of elements) element.onerror = fail;
    try {
      void Promise.all(elements.map(element => element.play())).then(() => {
        if (!alive.current || ticket !== generation.current) { elements.forEach(element => element.pause()); return; }
        setStatus('playing');
      }).catch(fail);
    } catch { fail(); }
  }
  function chooseMusic(value: Music) { setMusic(value); if (active.current) play(value, ambient); }
  function chooseAmbient(value: Ambience) { setAmbient(value); if (active.current) play(music, value); }
  function volume(channel: 'music' | 'ambient', value: number) {
    const level = Math.max(0, Math.min(100, value));
    if (channel === 'music') setMusicVolume(level); else setAmbientVolume(level);
    if (audio.current[channel]) audio.current[channel]!.volume = level / 100;
  }
  function toggleEffects(value: boolean) { setEffects(value); if (!value) release('reward'); }

  useEffect(() => {
    alive.current = true;
    const onVisibility = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => { alive.current = false; document.removeEventListener('visibilitychange', onVisibility); stop(); };
  }, []);

  useEffect(() => {
    if (!reward || seen.current.has(reward.recordId)) return;
    seen.current.add(reward.recordId);
    if (!effects || !active.current || document.hidden) return;
    release('reward');
    const element = create('reward', [3, 7, 14].includes(reward.total) ? 'sfx-tree-grow' : 'sfx-flower-bloom', 35);
    const ticket = generation.current;
    const fail = () => { if (alive.current && ticket === generation.current && audio.current.reward === element) { release('reward'); } };
    element.onerror = fail;
    try {
      void element.play().then(() => {
        if (!alive.current || ticket !== generation.current || audio.current.reward !== element) { element.pause(); return; }
        const started = Date.now();
        rewardTimer.current = setInterval(() => {
          const elapsed = Date.now() - started;
          if (elapsed >= 2000) release('reward');
          else element.volume = .35 * Math.min(1, (2000 - elapsed) / 400);
        }, 50);
      }).catch(fail);
    } catch { fail(); }
  }, [reward?.recordId, effects]);

  return { music, ambient, musicVolume, ambientVolume, effects, status, chooseMusic, chooseAmbient, volume, toggleEffects, play: () => play(), pause: () => stop() };
}
