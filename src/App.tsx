import { useState } from 'react';
import ChargingApp from './ui/ChargingApp';
import { activities, getActivities } from './data/activities';
import { recommend } from './domain/recommend';
import { getInsights } from './domain/insights';
import { loadData, saveData, exportData, parseImport } from './storage/store';

export default function App() {
  const [initial] = useState(() => loadData(
    (navigator.languages?.[0] ?? navigator.language).toLowerCase().startsWith('zh') ? 'zh-CN' : 'en',
  ));
  return <ChargingApp activities={activities} getActivities={getActivities} initialData={initial.data}
    initialWarning={initial.warning} recommend={recommend} getInsights={getInsights}
    saveData={saveData} exportData={exportData} parseImport={parseImport} />;
}
