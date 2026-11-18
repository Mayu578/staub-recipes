/* CSVの読み取り（引用符・セル内の改行に対応） */
export function parseCSV(t) {
  const rows = []
  let r = [], c = '', inq = false
  t = t.replace(/^\uFEFF/, '')
  for (let k = 0; k < t.length; k++) {
    const ch = t[k]
    if (inq) {
      if (ch === '"') { if (t[k + 1] === '"') { c += '"'; k++ } else inq = false }
      else c += ch
    } else if (ch === '"') inq = true
    else if (ch === ',' || ch === '\t') { r.push(c); c = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[k + 1] === '\n') k++
      r.push(c); c = ''; rows.push(r); r = []
    } else c += ch
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r) }
  return rows.filter((x) => x.some((v) => v.trim() !== ''))
}

function toObjects(rows) {
  if (!rows.length) return []
  const h = rows[0].map((s) => s.trim())
  return rows.slice(1).map((r) => Object.fromEntries(h.map((k, n) => [k, (r[n] || '').trim()])))
}

/* 見出しは完全一致を優先し、なければ「含む」で探す */
const col = (o, ...ks) => {
  for (const k of ks) if (o[k]) return o[k]
  for (const k of ks) {
    const h = Object.keys(o).find((x) => x.includes(k))
    if (h && o[h]) return o[h]
  }
  return ''
}
const lines = (s) => s.split(/\n|｜/).map((x) => x.trim()).filter(Boolean)

export function parseRecipes(text) {
  return toObjects(parseCSV(text))
    .map((o) => ({
      name: col(o, '料理名', 'レシピ名', 'タイトル'),
      cat: col(o, 'カテゴリ', '分類'),
      pot: col(o, '鍋', 'サイズ'),
      serv: col(o, '人数'),
      time: col(o, '調理時間', '時間'),
      ing: lines(col(o, '材料')),
      steps: lines(col(o, '作り方', '手順')),
      tip: col(o, 'コツ', 'ポイント', 'メモ'),
      img: col(o, '写真', '画像'),
    }))
    .filter((r) => r.name)
    .map((r, i) => ({ ...r, id: i }))
}
