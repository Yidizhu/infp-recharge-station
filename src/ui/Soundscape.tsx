import type { Locale } from '../contracts';
import { useSoundscape, type Ambience, type Music, type SoundReward } from './useSoundscape';
import '../styles/soundscape.css';

const words = {
  'zh-CN': { title: '听一会儿河岸', intro: '音乐和自然声，可以轻轻陪着你。', quiet: '默认安静', loading: '正在准备声音…', playing: '声音播放中', paused: '声音已暂停', error: '暂时没能播放，请检查网络后重试。', music: '背景音乐', ambient: '自然声音', off: '关闭', day: '日光 · 轻音乐', night: '夜色 · 轻音乐', river: '潺潺河流', leaves: '风过树叶', birds: '林间鸟鸣', musicVolume: '音乐音量', ambientVolume: '自然声音音量', effects: '完成充电时，轻响一下', play: '播放声音', retry: '重新播放', pause: '暂停声音', hint: '切到后台会暂停，回来后点播放即可。声音设置仅保留在本次打开中。', empty: '选一种声音，或开启完成音效，再点播放。' },
  en: { title: 'Listen by the river', intro: 'A little music and nature, here with you.', quiet: 'Quiet by default', loading: 'Preparing sounds…', playing: 'Sounds playing', paused: 'Sounds paused', error: 'Could not play. Check your connection and try again.', music: 'Background music', ambient: 'Nature sounds', off: 'Off', day: 'Daylight · soft music', night: 'Nightfall · soft music', river: 'Gentle river', leaves: 'Wind in the leaves', birds: 'Woodland birds', musicVolume: 'Music volume', ambientVolume: 'Nature volume', effects: 'A soft chime when a break is complete', play: 'Play sounds', retry: 'Try again', pause: 'Pause sounds', hint: 'Sounds pause in the background. Tap play when you return. These settings last for this visit.', empty: 'Choose a sound or enable completion chimes, then tap play.' },
};

export default function Soundscape({ locale, reward }: { locale: Locale; reward?: SoundReward | null }) {
  const t = words[locale];
  const sound = useSoundscape(reward);
  const running = sound.status === 'playing' || sound.status === 'loading';
  const empty = sound.music === 'off' && sound.ambient === 'off' && !sound.effects;
  return <details className="soundscape">
    <summary><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l11-2v13M9 9l11-2"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="17" cy="16" rx="3" ry="2"/></svg><span>{t.title}<small>{t[sound.status]}</small></span></summary>
    <div className="soundscape-body">
      <p>{t.intro}</p>
      <div className="soundscape-channels">
        <div><label>{t.music}<select value={sound.music} onChange={event => sound.chooseMusic(event.target.value as Music)}><option value="off">{t.off}</option><option value="day">{t.day}</option><option value="night">{t.night}</option></select></label><label className="soundscape-volume">{t.musicVolume}<span>{sound.musicVolume}%</span><input type="range" min="0" max="100" value={sound.musicVolume} onChange={event => sound.volume('music', Number(event.target.value))}/></label></div>
        <div><label>{t.ambient}<select value={sound.ambient} onChange={event => sound.chooseAmbient(event.target.value as Ambience)}><option value="off">{t.off}</option><option value="river">{t.river}</option><option value="leaves">{t.leaves}</option><option value="birds">{t.birds}</option></select></label><label className="soundscape-volume">{t.ambientVolume}<span>{sound.ambientVolume}%</span><input type="range" min="0" max="100" value={sound.ambientVolume} onChange={event => sound.volume('ambient', Number(event.target.value))}/></label></div>
      </div>
      <label className="soundscape-effects"><input type="checkbox" checked={sound.effects} onChange={event => sound.toggleEffects(event.target.checked)}/>{t.effects}</label>
      <button type="button" className="soundscape-play" onClick={running ? sound.pause : sound.play} disabled={!running && empty}>{running ? t.pause : sound.status === 'error' ? t.retry : t.play}</button>
      <p className="soundscape-status" role="status">{empty ? t.empty : t[sound.status]}</p>
      <p className="soundscape-hint">{t.hint}</p>
      <p className="soundscape-hint">{locale === 'zh-CN' ? '首次播放需联网，已缓存的声音可离线播放。刷新后默认静音。' : 'Connect for the first play; cached sounds can play offline. Reloading starts quiet.'}</p>
    </div>
  </details>;
}
