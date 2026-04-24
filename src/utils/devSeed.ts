/**
 * 開発用サンプルデータ投入（import.meta.env.DEV のときのみ動作）
 * main.tsx から呼ぶ。本番ビルドには含まれない。
 */
export function injectDevSeed() {
  if (!import.meta.env.DEV) return
  if (localStorage.getItem('strength-log-dev-seeded') === 'v4') return

  const exercises = (() => {
    try { return JSON.parse(localStorage.getItem('strength-log-exercises') ?? '[]') } catch { return [] }
  })()

  function findId(name: string): string | null {
    return exercises.find((e: { name: string }) => e.name === name)?.id ?? null
  }

  const bench = findId('ベンチプレス')
  if (!bench) {
    console.warn('[devSeed] 種目が見つかりません。アプリを一度開いてから再ロードしてください。')
    return
  }

  // ベンチプレス: 14日分の推移グラフ用
  const benchRecords = [
    { date: '2026-04-04', weight: 60,   reps: [10, 10, 10] },
    { date: '2026-04-05', weight: 62.5, reps: [10, 10,  9] },
    { date: '2026-04-06', weight: 62.5, reps: [10, 10, 10] },
    { date: '2026-04-07', weight: 65,   reps: [ 9,  9,  8] },
    { date: '2026-04-08', weight: 65,   reps: [10,  9,  9] },
    { date: '2026-04-09', weight: 67.5, reps: [ 8,  8,  7] },
    { date: '2026-04-10', weight: 67.5, reps: [ 9,  8,  8] },
    { date: '2026-04-11', weight: 70,   reps: [ 7,  7,  6] },
    { date: '2026-04-12', weight: 70,   reps: [ 8,  7,  7] },
    { date: '2026-04-13', weight: 72.5, reps: [ 7,  6,  6] },
    { date: '2026-04-14', weight: 72.5, reps: [ 7,  7,  6] },
    { date: '2026-04-15', weight: 75,   reps: [ 6,  6,  5] },
    { date: '2026-04-16', weight: 75,   reps: [ 7,  6,  6] },
    { date: '2026-04-17', weight: 77.5, reps: [ 6,  5,  5] },
  ].map(({ date, weight, reps }) => ({
    id: `seed-bench-${date}`,
    exerciseId: bench,
    date,
    sets: reps.map((r, i) => ({ id: `seed-bench-${date}-${i}`, weight, reps: r, memo: '' })),
  }))

  // 今日（2026-04-17）に10種目: TrophyBadge スクロール確認用
  const todayExercises: { key: string; name: string; weight: number; reps: number[] }[] = [
    { key: 'inc-bench',  name: 'インクラインベンチプレス', weight: 60,  reps: [10, 8, 8] },
    { key: 'chest-press',name: 'チェストプレス',           weight: 55,  reps: [12, 10, 10] },
    { key: 'deadlift',   name: 'デッドリフト',             weight: 100, reps: [5, 5, 5] },
    { key: 'lat',        name: 'ラットプルダウン',          weight: 60,  reps: [10, 10, 8] },
    { key: 'squat',      name: 'スクワット',               weight: 80,  reps: [8, 8, 6] },
    { key: 'shoulder',   name: 'ショルダープレス',          weight: 40,  reps: [10, 10, 8] },
    { key: 'curl',       name: 'バーベルカール',            weight: 30,  reps: [12, 10, 10] },
    { key: 'hip-thrust', name: 'ヒップスラスト',            weight: 60,  reps: [15, 12, 12] },
    { key: 'crunch',     name: 'クランチ',                 weight: 0,   reps: [20, 20, 20] },
    { key: 'leg-press',  name: 'レッグプレス',             weight: 120, reps: [10, 10, 8] },
  ]

  const todayRecords = todayExercises.flatMap(({ key, name, weight, reps }) => {
    const exId = findId(name)
    if (!exId) return []
    return [{
      id: `seed-today-${key}`,
      exerciseId: exId,
      date: '2026-04-17',
      sets: reps.map((r, i) => ({ id: `seed-today-${key}-${i}`, weight, reps: r, memo: '' })),
    }]
  })

  const existing = (() => {
    try { return JSON.parse(localStorage.getItem('strength-log-records') ?? '[]') } catch { return [] }
  })()

  const merged = [
    ...existing.filter((r: { id: string }) => !r.id.startsWith('seed-')),
    ...benchRecords,
    ...todayRecords,
  ]

  localStorage.setItem('strength-log-records', JSON.stringify(merged))

  // 体組成データ: 2026-03-24 〜 2026-04-22（30日・一部欠損あり）
  const bodyData: { date: string; weight: number; bodyFat: number }[] = [
    { date: '2026-03-24', weight: 76.2, bodyFat: 22.8 },
    { date: '2026-03-25', weight: 76.0, bodyFat: 22.7 },
    { date: '2026-03-27', weight: 75.8, bodyFat: 22.5 },
    { date: '2026-03-28', weight: 75.9, bodyFat: 22.6 },
    { date: '2026-03-29', weight: 75.6, bodyFat: 22.4 },
    { date: '2026-03-31', weight: 75.4, bodyFat: 22.3 },
    { date: '2026-04-01', weight: 75.5, bodyFat: 22.2 },
    { date: '2026-04-02', weight: 75.2, bodyFat: 22.1 },
    { date: '2026-04-03', weight: 75.0, bodyFat: 22.0 },
    { date: '2026-04-04', weight: 75.1, bodyFat: 21.9 },
    { date: '2026-04-05', weight: 74.9, bodyFat: 21.8 },
    { date: '2026-04-07', weight: 74.7, bodyFat: 21.7 },
    { date: '2026-04-08', weight: 74.8, bodyFat: 21.6 },
    { date: '2026-04-09', weight: 74.5, bodyFat: 21.5 },
    { date: '2026-04-10', weight: 74.3, bodyFat: 21.4 },
    { date: '2026-04-11', weight: 74.4, bodyFat: 21.3 },
    { date: '2026-04-12', weight: 74.2, bodyFat: 21.2 },
    { date: '2026-04-14', weight: 74.0, bodyFat: 21.1 },
    { date: '2026-04-15', weight: 74.1, bodyFat: 21.0 },
    { date: '2026-04-16', weight: 73.9, bodyFat: 20.9 },
    { date: '2026-04-17', weight: 73.8, bodyFat: 20.8 },
    { date: '2026-04-18', weight: 73.7, bodyFat: 20.7 },
    { date: '2026-04-19', weight: 73.9, bodyFat: 20.8 },
    { date: '2026-04-21', weight: 73.6, bodyFat: 20.6 },
    { date: '2026-04-22', weight: 73.5, bodyFat: 20.5 },
  ]

  const bodyRecords = bodyData.map(({ date, weight, bodyFat }) => ({
    date,
    weight,
    bodyFat,
    muscleMass: null,
    waist: null,
    memo: '',
  }))

  const existingBody = (() => {
    try { return JSON.parse(localStorage.getItem('strength-log-body-records') ?? '[]') } catch { return [] }
  })()
  const mergedBody = [
    ...existingBody.filter((r: { date: string }) =>
      !bodyData.some((d) => d.date === r.date)
    ),
    ...bodyRecords,
  ]
  localStorage.setItem('strength-log-body-records', JSON.stringify(mergedBody))

  localStorage.setItem('strength-log-dev-seeded', 'v4')
  console.log(`[devSeed] 体組成 ${bodyRecords.length} 件追加`)
}
