import { useEffect, useMemo, useRef, useState } from 'react';
import type { Activity, AppData, ChargingAppProps, CheckIn, Drain, Duration, Energy, Feedback, LanguagePreference, Locale, SessionRecord } from '../contracts';
import ConfirmDialog, { type Confirmation } from './ConfirmDialog';
import { useSessionTimer } from './useSessionTimer';
import { createSessionId } from './sessionId';
import Garden, { type GardenReward } from './Garden';
import Soundscape from './Soundscape';
import { getGardenState } from './gardenState';
import { resolveLocale, translate, useSystemLocale } from './i18n';
import '../styles/charging.css';

type Page = 'charge' | 'history' | 'favorites' | 'settings';
type Phase = 'checkin' | 'card' | 'timer' | 'feedback' | 'done';
const drains: [Drain, string][] = [['social', '人太多'], ['rumination', '脑内循环'], ['tasks', '任务压着'], ['body', '身体累'], ['unsure', '说不清']];
const energies = ['一格', '两格', '三格', '四格', '五格'];
const feedbacks: [Feedback, string][] = [[-1, '−1 更累了'], [0, '0 没变化'], [1, '+1 好一点'], [2, '+2 好很多'], [null, '不确定']];
const defaultCheckIn: CheckIn = { energy: 3, drain: 'unsure', minutes: 1 };
const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
const feedbackText = (value: Feedback) => feedbacks.find(([key]) => key === value)?.[1] ?? '不确定';

export default function ChargingApp(props: ChargingAppProps) {
  const { recommend, getInsights, saveData, exportData, parseImport } = props;
  const [data, setData] = useState<AppData>(props.initialData);
  const dataRef = useRef(data);
  const systemLocale = useSystemLocale();
  const locale = resolveLocale(data.language, systemLocale);
  const localeRef = useRef(locale);
  localeRef.current = locale;
  const t = (message: string, values?: Record<string, string | number>) => translate(locale, message, values);
  const activities = useMemo(() => props.getActivities?.(locale) ?? props.activities, [props.getActivities, props.activities, locale]);
  useEffect(() => { document.documentElement.lang = locale; document.title = translate(locale, 'INFP的充电站'); }, [locale]);
  const [page, setPage] = useState<Page>('charge');
  const [phase, setPhase] = useState<Phase>('checkin');
  const [checkIn, setCheckIn] = useState<CheckIn>(defaultCheckIn);
  const [step, setStep] = useState(0);
  const [activityId, setActivityId] = useState<string | null>(null);
  const activity = activities.find(item => item.id === activityId) ?? null;
  const [excluded, setExcluded] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [note, setNote] = useState('');
  const [recordId, setRecordId] = useState<string | null>(null);
  const [lastOutcome, setLastOutcome] = useState<SessionRecord['outcome']>('completed');
  const [gardenReward, setGardenReward] = useState<GardenReward | null>(null);
  const [warning, setWarning] = useState(props.initialWarning ?? '');
  const [warningLocale, setWarningLocale] = useState<Locale>(locale);
  const [externalNotice, setExternalNotice] = useState<{ text: string; locale: Locale } | null>(null);
  const [writeBlocked, setWriteBlocked] = useState(Boolean(props.initialWarning));
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState('');
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [importing, setImporting] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(20);
  const heading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const firstRender = useRef(true);
  const session = useRef<{ activity: Activity; checkIn: CheckIn } | null>(null);
  const busy = phase === 'timer' || phase === 'feedback';

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus();
  }, [page, phase]);

  function persist(next: AppData, force = false) {
    dataRef.current = next;
    setData(next);
    if (writeBlocked && !force) { setDirty(true); return; }
    try {
      const nextLocale = resolveLocale(next.language);
      const result = saveData(next, nextLocale);
      setWarningLocale(nextLocale);
      setDirty(!result.ok);
      setWarning(result.warning ?? (result.ok ? '' : '暂时无法保存。请重试，或先导出一份备份。'));
    } catch { setDirty(true); setWarning('暂时无法保存。请重试，或先导出一份备份。'); }
  }

  const timer = useSessionTimer((seconds, completed, start, end) => {
    const current = session.current;
    if (!current) return;
    session.current = null;
    const record: SessionRecord = {
      id: createSessionId(), activityId: current.activity.id,
      startedAt: new Date(start).toISOString(), endedAt: new Date(end).toISOString(),
      checkIn: current.checkIn, actualSeconds: seconds, outcome: completed ? 'completed' : 'stopped', feedback: null, note: '',
    };
    persist({ ...dataRef.current, records: [...dataRef.current.records, record] });
    setGardenReward(completed ? { recordId: record.id, total: getGardenState(dataRef.current.records).flowers } : null);
    setRecordId(record.id); setLastOutcome(record.outcome); setFeedback(null); setNote(''); setPhase('feedback');
  });

  useEffect(() => {
    if (phase !== 'timer' && !dirty) return;
    const preventLoss = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', preventLoss);
    return () => window.removeEventListener('beforeunload', preventLoss);
  }, [phase, dirty]);

  function pick(input = checkIn, previous: string[] = []) {
    const next = recommend(input, activities, dataRef.current.records, previous);
    setCheckIn(input); setActivityId(next?.id ?? null); setExcluded(next ? [...previous, next.id] : previous); setPhase('card'); setNotice(''); setExternalNotice(null);
  }
  function start() {
    if (!activity || session.current) return;
    session.current = { activity, checkIn: { ...checkIn } };
    setGardenReward(null);
    timer.start(checkIn.minutes * 60); setPhase('timer');
  }
  function favorite(id: string) {
    const current = dataRef.current;
    const selected = current.favorites.includes(id);
    persist({ ...current, favorites: selected ? current.favorites.filter(item => item !== id) : [...current.favorites, id] });
    setNotice(selected ? '已取消收藏。' : '已收藏，下次可以在收藏里找到。');
  }
  function saveFeedback(skip = false) {
    if (!recordId) return;
    persist({ ...dataRef.current, records: dataRef.current.records.map(record => record.id === recordId ? { ...record, feedback: skip ? null : feedback, note: skip ? '' : note.trim() } : record) });
    setPhase('done');
  }
  function download() {
    try {
      const url = URL.createObjectURL(new Blob([exportData(dataRef.current, localeRef.current)], { type: 'application/json' }));
      const a = document.createElement('a'); a.href = url; a.download = `${t('INFP的充电站')}-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(a); a.click(); a.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice('已发起导出，请在下载中确认文件。');
    } catch { setNotice('导出未成功，请再试一次。'); }
  }
  async function importFile(file?: File) {
    if (!file) return;
    setImporting(true); setNotice(''); setExternalNotice(null);
    try {
      const json = await file.text();
      const parseLocale = localeRef.current;
      const result = parseImport(json, parseLocale);
      if (!result.data) { setExternalNotice({ text: result.error ?? translate(parseLocale, '文件无法识别，请选择INFP的充电站导出的 JSON 文件。'), locale: parseLocale }); return; }
      const imported = result.data;
      setConfirmation({ title: '用备份替换本机数据？', message: '备份里有 {records} 条记录和 {favorites} 个收藏。确认后会替换当前记录、收藏、主题和语言；建议先导出当前数据。', values: { records: imported.records.length, favorites: imported.favorites.length }, action: '确认替换', accept: () => {
        setWriteBlocked(false); persist(imported, true); setNotice('已载入备份；如出现保存提示，请重试或导出。'); setHistoryLimit(20);
      } });
    } catch { setNotice('无法读取文件，请重新选择有效的 JSON 备份。'); }
    finally { setImporting(false); }
  }
  function go(next: Page) { setPage(next); setNotice(''); setExternalNotice(null); }
  const variant = activity?.variants[checkIn.minutes];
  const insights = page === 'history' ? getInsights(data.records, activities, locale) : [];
  const favorites = activities.filter(item => data.favorites.includes(item.id));
  const pageTitle = page === 'settings' ? '按自己的习惯来' : page === 'history' ? '我的充电记录' : page === 'favorites' ? '留着，下次试试' : phase === 'checkin' ? '先看看，还剩多少电？' : phase === 'card' ? '先休息一会儿' : phase === 'timer' ? (timer.paused ? '停一会儿也可以' : '这段时间，留给自己') : phase === 'feedback' ? (lastOutcome === 'stopped' ? '今天先到这里' : '这段时间留给了自己') : '可以回到生活里了';

  return <div className="charging-app" data-theme={data.theme} lang={locale}>
    <a className="charge-skip" href="#charge-main">{t('跳到主要内容')}</a>
    <div className="charge-shell">
      <header className="charge-header"><span className="charge-brand"><svg viewBox="0 0 28 28" aria-hidden="true"><path d="M5 12 14 4l9 8v12H5Z M11 24v-9h6v9"/><path className="lamp" d="M12 10h4"/></svg>{t('INFP的充电站')}</span>
        {!busy && <button className="quiet" onClick={() => go(page === 'settings' ? 'charge' : 'settings')}>{t(page === 'settings' ? '返回充电' : '设置')}</button>}
        <label className="charge-language"><span>{t('语言')}</span><select aria-label={t('界面语言')} value={data.language ?? 'system'} onChange={event => persist({ ...dataRef.current, language: event.target.value as LanguagePreference })}>
          <option value="system">{t('跟随系统')}</option><option value="zh-CN" lang="zh-CN">简体中文</option><option value="en" lang="en">English</option>
        </select></label>
      </header>
      {(warning || dirty) && <aside className="charge-warning" role="alert"><p>{warning ? (warningLocale === locale ? t(warning) : t(writeBlocked ? '读取数据时遇到问题，原数据暂未覆盖。请先保留备份，再决定是否允许保存。' : '暂时无法保存。请重试，或先导出一份备份。')) : t('本次更改暂未保存。')}</p>{dirty && <p>{t('更改暂留在当前页面，关闭前请重试或导出备份。')}</p>}<div className="charge-actions">
        <button onClick={() => writeBlocked ? setConfirmation({ title: '允许保存当前数据？', message: '读取时发现了问题。继续保存可能覆盖原来的本机数据；请确认已经保留所需的原始备份。', action: '允许保存', accept: () => { setWriteBlocked(false); persist(dataRef.current, true); } }) : persist(dataRef.current)}>{t(writeBlocked ? '处理保存问题' : '重试保存')}</button><button onClick={download}>{t('导出当前数据')}</button>
      </div></aside>}
      <main id="charge-main">
        <h1 ref={heading} tabIndex={-1}>{t(pageTitle)}</h1>
        <p className="charge-notice" role="status">{externalNotice ? (externalNotice.locale === locale ? externalNotice.text : t('文件无法识别，请选择INFP的充电站导出的 JSON 文件。')) : t(notice)}</p>
        <Garden records={data.records} locale={locale} hidden={page !== 'charge' && page !== 'history'} compact={page === 'charge' && phase !== 'checkin' && phase !== 'done'} reward={page === 'charge' && (phase === 'feedback' || phase === 'done') ? gardenReward : null} stopped={page === 'charge' && (phase === 'feedback' || phase === 'done') && lastOutcome === 'stopped'}/>
        <Soundscape locale={locale} reward={gardenReward}/>
        {page === 'charge' && <>
          {phase === 'checkin' && <>
            <p className="charge-lead">{t('只有一格，也可以先不解释。')}</p>
            <fieldset><legend>{t('现在的电量')}</legend><div className="energy-options">{energies.map((label, i) => <button key={label} aria-pressed={step > 0 && checkIn.energy === i + 1} onClick={() => { setCheckIn({ ...checkIn, energy: (i + 1) as Energy }); setStep(Math.max(step, 1)); }}><span className="battery" aria-hidden="true">{energies.map((_, cell) => <i key={cell} className={cell <= i ? 'filled' : ''} />)}</span><span>{t(label)}</span><span className="selection" aria-hidden="true">{step > 0 && checkIn.energy === i + 1 ? '✓' : ''}</span></button>)}</div></fieldset>
            {step >= 1 && <fieldset><legend>{t('什么最耗电？')}</legend><div className="choice-grid">{drains.map(([value, label]) => <button key={value} aria-pressed={step >= 2 && checkIn.drain === value} onClick={() => { setCheckIn({ ...checkIn, drain: value }); setStep(2); }}>{step >= 2 && checkIn.drain === value && <span aria-hidden="true">✓ </span>}{t(label)}</button>)}</div></fieldset>}
            {step >= 2 && <fieldset><legend>{t('你现在有多久？')}</legend><div className="charge-actions">{([1, 3, 10] as Duration[]).map(minutes => <button key={minutes} aria-pressed={checkIn.minutes === minutes} onClick={() => setCheckIn({ ...checkIn, minutes })}>{checkIn.minutes === minutes && <span aria-hidden="true">✓ </span>}{t('{minutes} 分钟', { minutes })}</button>)}</div></fieldset>}
            <div className="primary-area"><button className="primary wide" disabled={step < 2} onClick={() => pick()}>{t('帮我选一个')}</button><button className="quiet wide" onClick={() => pick(defaultCheckIn)}>{t('先跳过，试试一分钟')}</button><p className="small">{t('跳过会按三格电、说不清来选。')}</p></div>
          </>}
          {phase === 'card' && <>{activity && variant ? <>
            <p className="charge-lead">{t('按你选的{energy}电量，留出 {minutes} 分钟。', { energy: t(energies[checkIn.energy - 1]), minutes: checkIn.minutes })}</p>
            <article className="activity-card"><div className="card-top"><span>{t('{minutes} 分钟', { minutes: checkIn.minutes })}</span><button className="quiet" aria-pressed={data.favorites.includes(activity.id)} onClick={() => favorite(activity.id)}>{t(data.favorites.includes(activity.id) ? '✓ 已收藏' : '收藏')}</button></div><h2>{activity.title}</h2><p className="small">{activity.environment}</p><p>{variant.intro}</p><ol>{variant.steps.map((text, i) => <li key={i}>{text}</li>)}</ol></article>
            <div className="charge-actions"><button onClick={() => pick(checkIn, excluded)}>{t('换一个')}</button>{checkIn.minutes !== 1 && <button onClick={() => setCheckIn({ ...checkIn, minutes: 1 })}>{t('缩为一分钟')}</button>}</div>
            <div className="primary-area"><button className="primary wide" onClick={start}>{t('开始充电')}</button><p className="small">{t('计时期间请保留页面。刷新会中断这次计时。')}</p></div>
          </> : <div className="charge-empty"><h2>{t('这一轮先看到这里')}</h2><p>{t('暂时没有其他合适的动作。可以重新选状态，或再看一遍。')}</p><button onClick={() => pick(checkIn, [])}>{t('重新看看')}</button></div>}<button className="quiet wide" onClick={() => setPhase('checkin')}>{t('重新选状态')}</button></>}
          {phase === 'timer' && activity && variant && <>
            <p className="charge-lead">{activity.title}</p><div className="timer-face"><p className="small">{t(timer.paused ? '已暂停' : '剩余时间')}</p><output role="timer" aria-live="off" aria-label={t('剩余 {seconds} 秒', { seconds: timer.remaining })}>{formatTime(timer.remaining)}</output><progress max={checkIn.minutes * 60} value={checkIn.minutes * 60 - timer.remaining} aria-label={t('本次计时进度')}/><p className="small">{t(timer.paused ? '暂停的时间不会计入。' : '不用盯着屏幕，时间到了会安静结束。')}</p></div><ol className="timer-steps">{variant.steps.map((text, i) => <li key={i}>{text}</li>)}</ol><div className="primary-area"><button className="primary wide" onClick={timer.toggle}>{t(timer.paused ? '继续计时' : '暂停计时')}</button><button className="quiet wide" onClick={timer.stop}>{t('提前结束')}</button></div>
          </>}
          {phase === 'feedback' && <>
            <p className="charge-lead">{t('现在比刚才，感觉怎么样？')}</p><p className="small">{t(lastOutcome === 'stopped' ? '这次会记为提前结束。' : '这次会记为完成。')}{t('没变化也可以，如实选就好。')}</p><fieldset><legend>{t('电量变化（可跳过）')}</legend><div className="choice-grid">{feedbacks.map(([value, label]) => <button key={String(value)} aria-pressed={feedback === value} onClick={() => setFeedback(value)}>{feedback === value && <span aria-hidden="true">✓ </span>}{t(label)}</button>)}</div></fieldset><label className="note-label" htmlFor="session-note">{t('想留一句话吗？（可不填）')}</label><textarea id="session-note" rows={3} maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder={t('比如：靠窗坐了一会儿，肩膀松了些。')}/><p className="small">{note.length}/500</p><div className="primary-area"><button className="primary wide" onClick={() => saveFeedback()}>{t('保存反馈')}</button><button className="quiet wide" onClick={() => saveFeedback(true)}>{t('跳过反馈')}</button></div>
          </>}
          {phase === 'done' && <div className="charge-empty"><div className="rest-mark" aria-hidden="true">✓</div><p>{t(dirty ? '这次记录暂留在页面里，请先处理上方的保存提示。' : '这次记录已保存在本机。想休息的时候，再回来。')}</p><button className="primary wide" onClick={() => go('history')}>{t('看看这次记录')}</button><button className="quiet wide" onClick={() => { setPhase('checkin'); setStep(0); }}>{t('回到充电')}</button></div>}
        </>}
        {page === 'history' && <>
          <p className="charge-lead">{t('记下适合自己的方式，不用每天来。')}</p><section className="insight-section"><h2>{t('我的充电说明书')}</h2>{insights.length ? insights.map((insight, i) => <p key={i}>{insight.text}<span className="small block">{t('来自 {count} 条记录，仅描述你的反馈。', { count: insight.sampleSize })}</span></p>) : <p>{t('还在了解你。有了至少 5 条已完成且有明确反馈的记录，再看看有没有常见的感受。')}</p>}</section>
          <h2>{t('历史记录')}<span className="small">{t('{count} 次', { count: data.records.length })}</span></h2>{data.records.length === 0 ? <div className="charge-empty"><p>{t('这里还没有记录。从一次一分钟的休息开始就好。')}</p><button onClick={() => go('charge')}>{t('去充电')}</button></div> : <><ul className="record-list">{[...data.records].sort((a, b) => b.startedAt.localeCompare(a.startedAt)).slice(0, historyLimit).map(record => <li key={record.id}><time dateTime={record.startedAt} className="small">{new Date(record.startedAt).toLocaleString(locale, { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time><h3>{activities.find(item => item.id === record.activityId)?.title ?? t('已归档的充电动作')}</h3><p>{t('{outcome}，实际 {time}', { outcome: t(record.outcome === 'completed' ? '已完成' : '提前结束'), time: formatTime(record.actualSeconds) })}</p><p className="small">{t('{feedback} · 开始时{energy}电', { feedback: t(feedbackText(record.feedback)), energy: t(energies[record.checkIn.energy - 1]) })}</p>{record.note && <p className="record-note">{record.note}</p>}</li>)}</ul>{data.records.length > historyLimit && <button className="wide" onClick={() => setHistoryLimit(historyLimit + 20)}>{t('再看 20 条')}</button>}</>}
        </>}
        {page === 'favorites' && <><p className="charge-lead">{t('把想再做的动作，放在手边。')}</p>{favorites.length ? <ul className="record-list">{favorites.map(item => <li key={item.id}><h2>{item.title}</h2><p>{item.variants[1].intro}</p><p className="small">{item.environment}</p><div className="charge-actions"><button onClick={() => {
          const selected = recommend(checkIn, [item], dataRef.current.records, []);
          if (!selected) { setNotice('这个动作暂时不适合当前电量。可以回到充电页重新选状态。'); return; }
          setActivityId(selected.id); setExcluded([selected.id]); setPhase('card'); go('charge');
        }}>{t('看看这个动作')}</button><button aria-label={t('取消收藏：{title}', { title: item.title })} onClick={() => favorite(item.id)}>{t('取消收藏')}</button></div></li>)}</ul> : <div className="charge-empty"><p>{t('还没有收藏。遇到想再试的动作时，点一下“收藏”。')}</p><button onClick={() => go('charge')}>{t('去选一个动作')}</button></div>}</>}
        {page === 'settings' && <>
          <fieldset><legend>{t('界面语言')}</legend><div className="charge-actions">{(['system', 'zh-CN', 'en'] as LanguagePreference[]).map(language => <button key={language} aria-pressed={(data.language ?? 'system') === language} onClick={() => persist({ ...dataRef.current, language })}>{(data.language ?? 'system') === language && <span aria-hidden="true">✓ </span>}<span lang={language === 'system' ? locale : language}>{language === 'system' ? t('跟随系统') : language === 'zh-CN' ? '简体中文' : 'English'}</span></button>)}</div></fieldset>
          <fieldset><legend>{t('页面明暗')}</legend><div className="charge-actions">{([['system', '跟随系统'], ['light', '日间'], ['dark', '夜间']] as const).map(([theme, label]) => <button key={theme} aria-pressed={data.theme === theme} onClick={() => persist({ ...dataRef.current, theme })}>{data.theme === theme && <span aria-hidden="true">✓ </span>}{t(label)}</button>)}</div></fieldset>
          <section className="settings-section"><h2>{t('数据留在这台设备')}</h2><p>{t('记录和备注保存在当前浏览器，清理浏览器数据可能会丢失。这里不是加密保险箱；重要记录可以定期导出。')}</p><button className="wide" onClick={download}>{t('导出数据')}</button><label className="file-label" htmlFor="charge-import">{t('导入备份（JSON 文件）')}</label><button className="wide" disabled={importing} onClick={() => fileInput.current?.click()}>{t('选择 JSON 文件')}</button><input hidden ref={fileInput} id="charge-import" type="file" accept=".json,application/json" disabled={importing} onChange={event => { void importFile(event.target.files?.[0]); event.target.value = ''; }}/>{importing && <p role="status">{t('正在读取备份…')}</p>}<p className="small">{t('文件验证通过后，会再请你确认是否替换当前数据。')}</p><button className="wide" onClick={() => setConfirmation({ title: '清空本机记录和收藏？', message: '清空后无法撤销。主题会保留；如有需要，请先取消并导出备份。', action: '确认清空', accept: () => { setWriteBlocked(false); persist({ ...dataRef.current, records: [], favorites: [] }, true); setNotice('当前记录和收藏已清空；如出现保存提示，请重试。'); } })}>{t('清空记录和收藏')}</button></section>
          <section className="settings-section"><h2>{t('安静一点')}</h2><p>{t('页面跟随系统的减少动态效果设置。声音默认关闭，可以在花园声音中开启。')}</p><p className="small">{t('INFP的充电站是日常休息工具。INFP 只是偏好入口，你可以按自己的感受来选。')}</p></section>
        </>}
      </main>
      {!busy && <nav className="charge-nav" aria-label={t('主要导航')}>{([['charge', '充电'], ['history', '记录'], ['favorites', '收藏']] as const).map(([value, label]) => <button key={value} aria-current={page === value ? 'page' : undefined} onClick={() => go(value)}>{t(label)}</button>)}</nav>}
      <footer className="charge-footer">{t('INFP的充电站 · 留一点时间给自己')}</footer>
    </div>
    {confirmation && <ConfirmDialog confirmation={{ ...confirmation, title: t(confirmation.title), message: t(confirmation.message, confirmation.values), action: t(confirmation.action) }} cancelLabel={t('取消')} close={() => setConfirmation(null)}/>}
  </div>;
}
