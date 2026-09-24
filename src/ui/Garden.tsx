import { useEffect, useId, useRef, useState } from 'react';
import type { Locale, SessionRecord } from '../contracts';
import { getGardenState, MAX_VISIBLE_FLOWERS } from './gardenState';
import { translate } from './i18n';
import '../styles/garden.css';

export interface GardenReward { recordId: string; total: number }
interface GardenProps {
  records: SessionRecord[]; locale: Locale; reward: GardenReward | null;
  compact?: boolean; hidden?: boolean; stopped?: boolean;
}
const flowerSpots = [
  [95, 348, 1], [531, 333, .9], [157, 373, 1.1], [574, 368, 1.05], [62, 313, .8], [479, 357, .85], [190, 337, .85],
  [616, 318, .8], [125, 322, .78], [508, 390, 1.1], [33, 363, 1.1], [559, 302, .73], [219, 390, 1.05], [603, 405, 1.12],
  [81, 396, 1.1], [448, 398, 1], [170, 306, .7], [586, 337, .82], [42, 285, .7], [520, 306, .7], [134, 407, 1.15],
  [625, 368, 1], [193, 361, .84], [456, 326, .74], [17, 398, 1.15], [546, 409, 1.05], [109, 289, .68], [491, 329, .75],
];
const stageMessages = { meadow: '河岸草地', seedling: '一株新树苗', youngTree: '小树长高了', canopy: '树冠舒展开了' };

/** One persistent scene. A new timer-completion event, never record hydration, starts a bloom. */
export default function Garden({ records, locale, reward, compact = false, hidden = false, stopped = false }: GardenProps) {
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const state = getGardenState(records);
  const id = useId().replace(/:/g, '');
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(() => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [background, setBackground] = useState(document.hidden);
  const [bloom, setBloom] = useState(false);
  const seenReward = useRef<string | null>(null);
  const motionBlocked = useRef(false);
  motionBlocked.current = paused || reduced || background;
  const eventId = reward?.recordId;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    const visibility = () => setBackground(document.hidden);
    document.addEventListener('visibilitychange', visibility);
    return () => { query.removeEventListener('change', update); document.removeEventListener('visibilitychange', visibility); };
  }, []);
  useEffect(() => {
    if (!eventId) { setBloom(false); return; }
    if (seenReward.current === eventId) return;
    seenReward.current = eventId;
    if (motionBlocked.current) return;
    setBloom(true);
    const timeout = window.setTimeout(() => setBloom(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [eventId]);
  useEffect(() => { if (paused || reduced || background) setBloom(false); }, [paused, reduced, background]);

  const milestone = reward?.total === 3 ? '树苗也探出了头。' : reward?.total === 7 ? '小树长高了，枝叶多了一点。' : reward?.total === 14 ? '树冠舒展开，河岸多了一片树荫。' : '';
  return <section className={`garden ${compact ? 'garden-compact' : ''}`} hidden={hidden} aria-label={t('我的河边花园')} data-stage={state.stage} data-motion={paused || reduced || background ? 'paused' : 'running'} data-bloom={bloom ? 'active' : 'idle'}>
    <div className="garden-heading"><div><p className="garden-kicker">{t('慢慢长，也很好')}</p><h2>{t('河边的小花园')}</h2></div><button className="garden-motion" aria-pressed={paused || reduced} disabled={reduced} onClick={() => setPaused(value => !value)}>
      <svg viewBox="0 0 20 20" aria-hidden="true">{paused || reduced ? <path d="m7 4 9 6-9 6Z"/> : <path d="M6 4v12M14 4v12"/>}</svg>
      {t(reduced ? '动态已减少' : paused ? '播放花园动态' : '暂停花园动态')}
    </button></div>
    <div className="garden-picture">
      <svg className="garden-landscape" viewBox={compact ? '0 90 640 330' : '0 0 640 420'} aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-sky`} x2="0" y2="1"><stop stopColor="var(--garden-sky-top)"/><stop offset="1" stopColor="var(--garden-sky-bottom)"/></linearGradient>
          <linearGradient id={`${id}-water`} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="var(--garden-water-far)"/><stop offset="1" stopColor="var(--garden-water)"/></linearGradient>
          <linearGradient id={`${id}-grass`} x2=".7" y2="1"><stop stopColor="var(--garden-grass-light)"/><stop offset="1" stopColor="var(--garden-grass)"/></linearGradient>
          <radialGradient id={`${id}-light`}><stop stopColor="var(--garden-sun)" stopOpacity=".3"/><stop offset="1" stopColor="var(--garden-sun)" stopOpacity="0"/></radialGradient>
          <clipPath id={`${id}-river`}><path d="M379 143C342 176 434 184 389 216S240 245 279 303 393 370 357 420H244c72-72-43-106-31-158s168-52 142-85-13-25 24-34Z"/></clipPath>
        </defs>
        <path fill={`url(#${id}-sky)`} d="M0 0h640v420H0Z"/>
        <circle fill={`url(#${id}-light)`} cx="486" cy="74" r="106"/>
        <circle className="garden-sun" cx="486" cy="72" r="26"/>
        <path className="garden-moon" d="M497 45a29 29 0 1 0 19 44 26 26 0 0 1-19-44Z"/>
        <g className="garden-stars" fill="var(--garden-starlight)"><circle cx="335" cy="35" r="1.5"/><circle cx="432" cy="51" r="2"/><circle cx="584" cy="35" r="1.8"/><circle cx="560" cy="93" r="1.3"/><path d="m394 69 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z"/></g>
        <g fill="var(--garden-cloud)" opacity=".7"><path d="M45 55c24-12 57-12 80 0h53c-40 10-97 10-133 0Z"/><path d="M298 92c23-10 48-10 72 0h67c-48 9-102 8-139 0Z"/></g>
        <path fill="var(--garden-mountain-far)" d="M0 158 83 93q17-12 34 1l60 43 69-80q19-21 38 3l70 79 58-29q20-9 34 5l74 57 66-52q21-14 36 0l28 24v122H0Z"/>
        <path fill="var(--garden-mountain)" d="M0 192q100-82 183-32t159 1 180-4 118-21v120H0Z"/>
        <path fill="var(--garden-mist)" opacity=".5" d="M0 166q140 22 294 0t346-3v16q-185-12-340 10T0 180Z"/>
        <path fill="var(--garden-grass-light)" d="M0 195q170-51 359-39 158-24 281 28v236H0Z"/>
        <path fill={`url(#${id}-grass)`} d="M0 253q108-44 227-16 83 6 139-26 145-70 274 31v178H0Z"/>
        <path fill="var(--garden-bank)" d="M378 142c-35 33 61 43 17 79s-151 31-109 87 118 68 79 112H231c69-77-45-104-29-163s179-51 146-80-5-27 30-35Z"/>
        <path fill={`url(#${id}-water)`} d="M379 143C342 176 434 184 389 216S240 245 279 303 393 370 357 420H244c72-72-43-106-31-158s168-52 142-85-13-25 24-34Z"/>
        <g clipPath={`url(#${id}-river)`} fill="none" stroke="var(--garden-water-shine)" strokeLinecap="round">
          <path opacity=".35" strokeWidth="18" d="M372 165c39 35 14 46-72 80s-46 63-5 91 51 51 18 91"/>
          <path className="garden-river-flow" strokeWidth="2.5" strokeDasharray="18 54 42 70" d="M370 160c36 39 24 45-61 78s-75 58-19 98 58 63 20 102"/>
          <path className="garden-river-flow garden-river-flow-slow" strokeWidth="1.5" strokeDasharray="24 73 12 47" d="M366 163c15 36 15 33-80 77s-33 79 9 107 26 65 15 90"/>
          <path strokeWidth="2" opacity=".7" d="M354 190h17m-82 63h23m-76 30h22m65 66h28m-72 53h25"/>
        </g>
        <path fill="var(--garden-path)" d="M576 210c-26 27-78 16-80 53s49 33 67 60 4 62-22 97h50c28-49 30-79-7-108s-77-35-66-54 52-18 69-46Z"/>
        <g fill="var(--garden-path-mark)" opacity=".7"><ellipse cx="549" cy="248" rx="12" ry="3" transform="rotate(-15 549 248)"/><ellipse cx="539" cy="287" rx="13" ry="4" transform="rotate(24 539 287)"/><ellipse cx="587" cy="340" rx="13" ry="5"/><ellipse cx="570" cy="390" rx="17" ry="6" transform="rotate(-20 570 390)"/></g>
        <g className="garden-cottage"><ellipse cx="557" cy="216" rx="54" ry="10" fill="var(--garden-shadow)" opacity=".35"/><path fill="var(--garden-house)" d="M520 169h67v43h-67Z"/><path fill="var(--garden-house-side)" d="m587 168 19 8v36h-19Z"/><path fill="var(--garden-roof)" d="m510 173 43-38 45 38Zm43-38 44 10 21 34-20-6Z"/><path fill="var(--garden-window)" d="M535 180h15v17h-15Zm30 2h12v30h-12Z"/><path stroke="var(--garden-house)" strokeWidth="2" d="M542.5 180v17m-7.5-9h15"/><path fill="var(--garden-house-side)" d="M580 143v-14h8v17Z"/></g>
        <g fill="var(--garden-leaf-back)"><path d="m609 215 10-43 11 43Zm-116-14 9-34 10 34Zm-26-17 6-23 8 23Z"/><path d="M604 195h29v3h-29Zm-114-12h24v3h-24Z"/></g>
        <g className="garden-main-tree">
          <ellipse cx="115" cy="289" rx="85" ry="14" fill="var(--garden-shadow)" opacity=".4"/>
          <path fill="var(--garden-trunk)" d="m104 294 8-104-32-40 7-6 32 37 21-51 7 4-21 69 5 91Z"/>
          <path fill="none" stroke="var(--garden-bark)" strokeWidth="2" d="m120 279-2-69m0 35 8 6m-7-46 13-19"/>
          <g className="garden-canopy"><path fill="var(--garden-leaf-back)" d="M39 197c-31-9-36-52-8-66-12-32 16-61 46-58 9-40 54-48 81-18 39-13 72 15 64 45 35 26 22 68-10 76-10 32-54 41-76 19-25 25-72 26-97 2Z"/><path fill="var(--garden-leaf)" d="M23 150c-6-26 13-44 35-43-5-29 15-45 41-39 17-31 53-31 68-2 37-4 53 19 41 45 26 21 6 47-15 42-25 31-64 23-74 3-23 25-68 27-76 0Z"/><path fill="var(--garden-leaf-light)" opacity=".7" d="M49 111c4-23 24-30 43-20 6-26 43-29 58-9-32-2-32 24-56 26-21-7-28 10-45 3Zm82 19c9-18 32-22 49-11-4 12-36 21-49 11Z"/><g fill="var(--garden-leaf-vein)" opacity=".6"><ellipse cx="65" cy="145" rx="8" ry="3" transform="rotate(-30 65 145)"/><ellipse cx="101" cy="119" rx="7" ry="3" transform="rotate(28 101 119)"/><ellipse cx="163" cy="91" rx="7" ry="3" transform="rotate(-40 163 91)"/><ellipse cx="178" cy="155" rx="9" ry="3" transform="rotate(20 178 155)"/><ellipse cx="83" cy="177" rx="7" ry="3"/></g></g>
          <g fill="var(--garden-leaf-back)"><path d="M69 285q-26-42-35-12 7 20 35 12Zm75 5q22-43 35-16-6 20-35 16Z"/></g>
        </g>
        <g className="garden-growing-tree" data-tree-stage={state.stage} transform="translate(454 284)">
          <ellipse cy="8" rx={state.stage === 'canopy' ? 61 : 36} ry="9" fill="var(--garden-shadow)" opacity=".35"/>
          {state.stage === 'meadow' ? <g><ellipse cy="5" rx="18" ry="5" fill="var(--garden-soil)"/><path stroke="var(--garden-trunk)" strokeWidth="3" d="M12 5v-23"/><path fill="var(--garden-path)" d="M4-25h20v12H4Z"/><path stroke="var(--garden-leaf-back)" strokeWidth="2" d="m10-18 4-3 5 3"/></g> : state.stage === 'seedling' ? <g><path d="M0 4q-3-25 4-46" fill="none" stroke="var(--garden-trunk)" strokeWidth="4"/><path fill="var(--garden-leaf)" d="M0-20q-31-1-22-23 26 1 22 23Zm1-9q28 4 27-19-22-5-27 19Z"/><path stroke="var(--garden-leaf-back)" strokeWidth="1.5" d="m-16-36 15 15m19-20L3-31"/></g> : <g transform={state.stage === 'canopy' ? 'scale(1)' : 'scale(.67)'}>
            <path fill="var(--garden-trunk)" d="m-7 8 4-78-18-26 5-4 20 25 16-29 5 4-19 39 5 69Z"/>
            <g className="garden-canopy"><path fill="var(--garden-leaf-back)" d="M-43-59c-34-8-41-44-17-64-5-26 21-42 43-33 17-31 53-20 59 4 33-7 54 20 41 43 28 31-6 61-30 49-19 29-74 30-96 1Z"/><path fill="var(--garden-leaf)" d="M-54-109c-9-23 10-40 31-32 18-30 48-23 53 2 29-11 49 18 34 37-12 24-39 25-53 7-17 27-59 26-65-14Z"/><path fill="var(--garden-leaf-light)" d="M-33-127c12-26 42-29 53-7-22-2-33 22-53 7Z"/><g fill="var(--garden-flower-pink)" opacity=".9"><circle cx="-40" cy="-94" r="4"/><circle cx="37" cy="-117" r="4"/><circle cx="9" cy="-63" r="4"/></g></g>
          </g>}
        </g>
        <g fill="var(--garden-rock)"><path d="M200 292q1-14 17-14 18 1 19 15Z"/><path d="M243 326q4-19 20-16 13 3 15 18Z"/><path d="M396 245q1-11 12-11 12 1 14 12Z"/><path d="M61 329q4-12 18-10l10 15Z"/></g>
        <g fill="none" stroke="var(--garden-grass-stroke)" strokeWidth="2" strokeLinecap="round"><path d="m17 281-4-10m4 10 5-8m124 35-4-9m4 9 5-10m51 63-5-12m5 12 5-8m283-89-4-10m4 10 6-8m83-4-4-8m4 8 5-10m-81 114-5-12m5 12 6-8m-526 2-4-9m4 9 6-11"/></g>
        <path fill="var(--garden-foreground)" opacity=".5" d="M0 404q95-29 202 16H0Zm402 16q130-46 238-31v31Z"/>
        {flowerSpots.slice(0, state.visibleFlowers).map(([x, y, scale], index) => <g key={index} transform={`translate(${x} ${y}) scale(${scale})`} className="garden-flower" data-flower="true">
          <g className={bloom && index === state.visibleFlowers - 1 ? 'garden-new-flower' : undefined}>
            <path fill="none" stroke="var(--garden-stem)" strokeWidth="2.5" d="M0 2q-3-15 0-31"/><path fill="var(--garden-leaf-back)" d="M0-9q-17 0-14-13 14 1 14 13Zm-1-8q15-1 13-12-13 0-13 12Z"/>
            <g transform="translate(0 -32)" fill={index % 3 === 0 ? 'var(--garden-flower-pink)' : index % 3 === 1 ? 'var(--garden-flower-cream)' : 'var(--garden-flower-purple)'}><ellipse cy="-6" rx="4.5" ry="7"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(72)"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(144)"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(216)"/><ellipse cy="-6" rx="4.5" ry="7" transform="rotate(288)"/><circle r="3.7" fill="var(--garden-flower-center)"/></g>
            {bloom && index === state.visibleFlowers - 1 && <circle className="garden-bloom-ring" cy="-32" r="19" fill="none" stroke="var(--garden-flower-center)" strokeWidth="2"/>}
          </g>
        </g>)}
        <g fill="var(--garden-water-shine)" opacity=".6"><ellipse cx="347" cy="386" rx="9" ry="2"/><ellipse cx="252" cy="302" rx="8" ry="1.5"/></g>
      </svg>
    </div>
    <div className="garden-caption"><div><span className="garden-flower-count">{t('已种下 {count} 朵花', { count: state.flowers })}</span><span className="garden-stage">{t(stageMessages[state.stage])}</span></div><span className="garden-caption-mark" aria-hidden="true"><svg viewBox="0 0 36 36"><path d="M18 31V15M18 24C4 25 6 13 18 24Zm0-6c14 1 12-11 0 0Z"/><circle cx="18" cy="9" r="5"/></svg></span></div>
    {reward && <div className="garden-reward" role="status"><strong>{t('这次休息，让一朵花开了。')}</strong>{milestone && <span>{t(milestone)}</span>}<span>{t('无论感觉如何，这朵花都属于你。')}</span></div>}
    {stopped && !reward && <p className="garden-kind-note">{t('今天先歇到这里。花园还在，已有的花一朵也不会少。')}</p>}
    {!compact && <details className="garden-rules"><summary>{t('花园怎样长大？')}</summary><p>{t('每次完整休息种一朵花，跳过反馈或感觉更累也照样计入。提前结束不会扣花。')}</p><ol className="garden-milestones">{[[3, '树苗探头'], [7, '小树长高'], [14, '树冠舒展']].map(([count, label]) => <li key={count} data-grown={state.flowers >= Number(count)}><span>{count}</span>{t(String(label))}{state.flowers >= Number(count) && <span className="garden-milestone-check" aria-label={t('已长成')}>✓</span>}</li>)}</ol><p>{t('3 次长出树苗，7 次长成小树，14 次舒展树冠；之后每次完整休息仍会添花。')}</p><p>{t('画面最多展示 {limit} 朵花，文字记录全部花朵。不用连续打卡，花园不会枯萎。', { limit: MAX_VISIBLE_FLOWERS })}</p></details>}
  </section>;
}
