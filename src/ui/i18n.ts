import { useEffect, useState } from 'react';
import type { LanguagePreference, Locale } from '../contracts';

// Chinese source strings are stable message keys. Personal notes never pass through this dictionary.
export const english: Record<string, string> = {
  '慢慢长，也很好': 'A little room to grow', '河边的小花园': 'Your riverside garden', '我的河边花园': 'My riverside garden',
  '河岸草地': 'A meadow by the river', '一株新树苗': 'A new seedling', '小树长高了': 'A growing young tree', '树冠舒展开了': 'A tree with room for shade',
  '动态已减少': 'Motion reduced', '播放花园动态': 'Play garden motion', '暂停花园动态': 'Pause garden motion',
  '已种下 {count} 朵花': 'Flowers planted: {count}', '这次休息，让一朵花开了。': 'A flower opened for this break.',
  '无论感觉如何，这朵花都属于你。': 'However you feel, this flower is yours.',
  '树苗也探出了头。': 'A new seedling has appeared, too.', '小树长高了，枝叶多了一点。': 'Your young tree has grown a little taller.',
  '树冠舒展开，河岸多了一片树荫。': 'Your tree has spread its canopy, making a little shade by the river.',
  '今天先歇到这里。花园还在，已有的花一朵也不会少。': 'That’s enough for now. Your garden is here, and every flower stays.',
  '花园怎样长大？': 'How does the garden grow?', '每次完整休息种一朵花，跳过反馈或感觉更累也照样计入。提前结束不会扣花。': 'Each completed break plants a flower, even if you skip feedback or feel more tired. Ending early never takes flowers away.',
  '树苗探头': 'A seedling', '小树长高': 'A young tree', '树冠舒展': 'A full canopy', '已长成': 'Grown',
  '3 次长出树苗，7 次长成小树，14 次舒展树冠；之后每次完整休息仍会添花。': 'After 3 completed breaks, a seedling appears; at 7, a young tree; at 14, a full canopy. Every completed break after that still adds a flower.',
  '画面最多展示 {limit} 朵花，文字记录全部花朵。不用连续打卡，花园不会枯萎。': 'The scene shows up to {limit} flowers; the total counts them all. No streaks to keep. Your garden will not wither.',
  'INFP的充电站': 'INFP Recharge Station',
  '界面语言': 'Language', '语言': 'Language', '跟随系统': 'System',
  '人太多': 'Too much social time', '脑内循环': 'Thoughts on repeat', '任务压着': 'Too much to do', '身体累': 'Body feels tired', '说不清': 'Not sure',
  '一格': '1 bar', '两格': '2 bars', '三格': '3 bars', '四格': '4 bars', '五格': '5 bars',
  '−1 更累了': '−1 More tired', '0 没变化': '0 No change', '+1 好一点': '+1 A little better', '+2 好很多': '+2 Much better', '不确定': 'Not sure',
  '暂时无法保存。请重试，或先导出一份备份。': 'Could not save. Try again, or export a backup first.',
  '读取数据时遇到问题，原数据暂未覆盖。请先保留备份，再决定是否允许保存。': 'There was a problem loading your data. The original data has not been overwritten. Keep a backup before allowing changes to be saved.',
  '已取消收藏。': 'Removed from favorites.', '已收藏，下次可以在收藏里找到。': 'Saved to favorites for next time.',
  '已发起导出，请在下载中确认文件。': 'Export started. Check your downloads for the file.', '导出未成功，请再试一次。': 'Export failed. Please try again.',
  '文件无法识别，请选择INFP的充电站导出的 JSON 文件。': 'File not recognized. Choose a JSON backup exported from INFP Recharge Station.',
  '用备份替换本机数据？': 'Replace local data with this backup?',
  '备份里有 {records} 条记录和 {favorites} 个收藏。确认后会替换当前记录、收藏、主题和语言；建议先导出当前数据。': 'This backup contains {records} records and {favorites} favorites. It will replace your records, favorites, theme and language. Export your current data first if you want to keep it.',
  '确认替换': 'Replace data', '已载入备份；如出现保存提示，请重试或导出。': 'Backup loaded. If a save warning appears, retry or export your data.',
  '无法读取文件，请重新选择有效的 JSON 备份。': 'Could not read the file. Choose a valid JSON backup and try again.',
  '按自己的习惯来': 'Make yourself comfortable', '我的充电记录': 'My recharge history', '留着，下次试试': 'Keep these for next time',
  '先看看，还剩多少电？': 'How much energy is left?', '先休息一会儿': 'Take a little break', '停一会儿也可以': 'A pause is welcome',
  '这段时间，留给自己': 'This time is yours', '今天先到这里': 'That’s enough for now', '这段时间留给了自己': 'You took some time for yourself',
  '可以回到生活里了': 'Ready when you are', '跳到主要内容': 'Skip to main content', '返回充电': 'Back to recharge', '设置': 'Settings',
  '本次更改暂未保存。': 'Your changes have not been saved yet.', '更改暂留在当前页面，关闭前请重试或导出备份。': 'Your changes are still on this page. Retry or export a backup before closing it.',
  '允许保存当前数据？': 'Allow the current data to be saved?',
  '读取时发现了问题。继续保存可能覆盖原来的本机数据；请确认已经保留所需的原始备份。': 'There was a problem reading local data. Saving now may overwrite it. Make sure you have kept any original backup you need.',
  '允许保存': 'Allow saving', '处理保存问题': 'Resolve save issue', '重试保存': 'Retry saving', '导出当前数据': 'Export current data',
  '只有一格，也可以先不解释。': 'Just one bar is enough. No explanation needed.', '现在的电量': 'Your energy right now', '什么最耗电？': 'What has been draining you?',
  '你现在有多久？': 'How much time do you have?', '{minutes} 分钟': '{minutes} min', '帮我选一个': 'Pick something for me',
  '先跳过，试试一分钟': 'Skip and try one minute', '跳过会按三格电、说不清来选。': 'Skipping uses 3 bars and “Not sure” to pick an activity.',
  '按你选的{energy}电量，留出 {minutes} 分钟。': 'A {minutes}-minute break for your energy level: {energy}.',
  '✓ 已收藏': '✓ In favorites', '收藏': 'Favorites', '收藏这个动作': 'Save to favorites',
  '换一个': 'Try another', '缩为一分钟': 'Make it one minute', '开始充电': 'Start recharging',
  '计时期间请保留页面。刷新会中断这次计时。': 'Keep this page open. Refreshing will end this timer.',
  '这一轮先看到这里': 'That’s all for this round', '暂时没有其他合适的动作。可以重新选状态，或再看一遍。': 'There are no more matching activities. Change your check-in or look through them again.',
  '重新看看': 'Look again', '重新选状态': 'Change my check-in', '已暂停': 'Paused', '剩余时间': 'Time remaining',
  '剩余 {seconds} 秒': '{seconds} seconds remaining', '本次计时进度': 'Session progress', '暂停的时间不会计入。': 'Paused time does not count.',
  '不用盯着屏幕，时间到了会安静结束。': 'You can look away. The timer will finish quietly.', '继续计时': 'Resume timer', '暂停计时': 'Pause timer', '提前结束': 'End early',
  '现在比刚才，感觉怎么样？': 'How do you feel compared with before?', '这次会记为提前结束。': 'This session is marked as ended early. ', '这次会记为完成。': 'This session is marked as complete. ',
  '没变化也可以，如实选就好。': 'No change is a valid answer, too.', '电量变化（可跳过）': 'Energy change (optional)',
  '想留一句话吗？（可不填）': 'Leave a note? (optional)', '比如：靠窗坐了一会儿，肩膀松了些。': 'For example: Sitting by the window helped my shoulders relax.',
  '保存反馈': 'Save feedback', '跳过反馈': 'Skip feedback',
  '这次记录暂留在页面里，请先处理上方的保存提示。': 'Your record is still on this page. Please resolve the save warning above.',
  '这次记录已保存在本机。想休息的时候，再回来。': 'Your record is saved on this device. Come back when you want a break.',
  '看看这次记录': 'View this record', '回到充电': 'Back to recharge', '记下适合自己的方式，不用每天来。': 'Keep track of what suits you. No daily check-in needed.',
  '我的充电说明书': 'What works for me', '来自 {count} 条记录，仅描述你的反馈。': 'Based on {count} records. This only describes your feedback.',
  '还在了解你。有了至少 5 条已完成且有明确反馈的记录，再看看有没有常见的感受。': 'Still getting to know you. After at least 5 completed sessions with a rating, we can look for patterns in your feedback.',
  '历史记录': 'History', '{count} 次': '{count} sessions', '这里还没有记录。从一次一分钟的休息开始就好。': 'No records yet. A one-minute break is a good place to start.',
  '去充电': 'Take a break', '已归档的充电动作': 'Archived activity', '已完成': 'Completed', '{outcome}，实际 {time}': '{outcome} · Active time {time}',
  '{feedback} · 开始时{energy}电': '{feedback} · Started with {energy}', '再看 20 条': 'Show 20 more',
  '把想再做的动作，放在手边。': 'Keep activities you want to try again within reach.',
  '这个动作暂时不适合当前电量。可以回到充电页重新选状态。': 'This activity does not match your current energy level. Go back to recharge to update your check-in.',
  '看看这个动作': 'View activity', '取消收藏：{title}': 'Remove from favorites: {title}', '取消收藏': 'Remove favorite',
  '还没有收藏。遇到想再试的动作时，点一下“收藏”。': 'No favorites yet. Save an activity when you want to try it again.', '去选一个动作': 'Find an activity',
  '页面明暗': 'Appearance', '日间': 'Light', '夜间': 'Dark', '数据留在这台设备': 'Your data stays on this device',
  '记录和备注保存在当前浏览器，清理浏览器数据可能会丢失。这里不是加密保险箱；重要记录可以定期导出。': 'Records and notes are stored in this browser. Clearing browser data may remove them. This is not an encrypted vault; export important records regularly.',
  '导出数据': 'Export data', '导入备份（JSON 文件）': 'Import a backup (JSON file)', '选择 JSON 文件': 'Choose JSON file', '正在读取备份…': 'Reading backup…',
  '文件验证通过后，会再请你确认是否替换当前数据。': 'After checking the file, we will ask you to confirm before replacing current data.',
  '清空本机记录和收藏？': 'Clear local records and favorites?',
  '清空后无法撤销。主题会保留；如有需要，请先取消并导出备份。': 'This cannot be undone. Your theme and language will stay. Cancel and export a backup first if needed.',
  '确认清空': 'Clear data', '当前记录和收藏已清空；如出现保存提示，请重试。': 'Records and favorites cleared. If a save warning appears, please retry.',
  '清空记录和收藏': 'Clear records and favorites', '安静一点': 'Keep it quiet',
  '页面跟随系统的减少动态效果设置。声音默认关闭，可以在花园声音中开启。': 'The page follows your system’s reduced motion setting. Sound starts off; turn it on in Garden sounds.',
  'INFP的充电站是日常休息工具。INFP 只是偏好入口，你可以按自己的感受来选。': 'INFP Recharge Station is for everyday breaks. INFP is just a starting point. Choose what feels right for you.',
  '主要导航': 'Main navigation', '充电': 'Recharge', '记录': 'History', 'INFP的充电站 · 留一点时间给自己': 'INFP Recharge Station · A little time for you', '取消': 'Cancel',
};

export function getSystemLocale(): Locale {
  const language = typeof navigator === 'undefined' ? 'en' : navigator.languages?.[0] || navigator.language || 'en';
  return /^zh(?:-|$)/i.test(language) ? 'zh-CN' : 'en';
}
export function resolveLocale(preference: LanguagePreference = 'system', systemLocale = getSystemLocale()): Locale {
  return preference === 'system' ? systemLocale : preference;
}
export function useSystemLocale() {
  const [locale, setLocale] = useState(getSystemLocale);
  useEffect(() => {
    const update = () => setLocale(getSystemLocale());
    window.addEventListener('languagechange', update);
    return () => window.removeEventListener('languagechange', update);
  }, []);
  return locale;
}
export function translate(locale: Locale, message: string, values: Record<string, string | number> = {}) {
  const template = locale === 'en' ? english[message] ?? message : message;
  return template.replace(/\{(\w+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
