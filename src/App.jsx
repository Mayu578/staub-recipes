import { useEffect, useState } from 'react'
import { parseRecipes } from './csv'
import { SAMPLE } from './sample'
import { CONFIG } from './config'
import './style.css'

/* URLの #r0 のような部分を読む（戻るボタンで一覧に戻れる） */
function useHash() {
  const [hash, setHash] = useState(location.hash)
  useEffect(() => {
    const on = () => setHash(location.hash)
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

const metaOf = (r) =>
  [r.cat, r.pot && '鍋 ' + r.pot, r.serv, r.time && (isNaN(r.time) ? r.time : r.time + '分')].filter(Boolean)

export default function App() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const hash = useHash()

  /* 最初に1回だけ、データを読み込む */
  useEffect(() => {
    (async () => {
      try {
        if (CONFIG.CSV_URL) {
          const res = await fetch(CONFIG.CSV_URL)
          if (!res.ok) throw Error(res.status)
          const list = parseRecipes(await res.text())
          if (!list.length) throw Error('レシピが0件でした。見出し行を確認してください')
          setRecipes(list)
        } else setRecipes(parseRecipes(SAMPLE))
      } catch (e) {
        setRecipes(parseRecipes(SAMPLE))
        setNotice('読み込めませんでした：' + e.message + '（サンプルを表示しています）')
      }
      setLoading(false)
    })()
  }, [])

  async function pickFile(e) {
    const f = e.target.files[0]
    if (!f) return
    const list = parseRecipes(await f.text())
    setRecipes(list)
    setCat(''); setQ('')
    setNotice(list.length ? `${list.length}件のレシピを読み込みました。` : 'レシピを読み取れませんでした。見出し行（料理名・材料・作り方）を確認してください。')
    location.hash = ''
  }

  const m = hash.match(/^#r(\d+)$/)
  const recipe = m && recipes[+m[1]]

  return (
    <div id="app">
      {recipe ? (
        <Detail key={recipe.id} r={recipe} />
      ) : (
        <Home {...{ recipes, loading, notice, cat, setCat, q, setQ, pickFile }} />
      )}
    </div>
  )
}

function Home({ recipes, loading, notice, cat, setCat, q, setQ, pickFile }) {
  const cats = [...new Set(recipes.map((r) => r.cat).filter(Boolean))]
  const k = q.trim().toLowerCase()
  const shown = recipes.filter(
    (r) => (!cat || r.cat === cat) && (!k || (r.name + ' ' + r.ing.join(' ')).toLowerCase().includes(k))
  )
  return (
    <>
      <h1>{CONFIG.TITLE}</h1>
      {notice && <div className="note">{notice}</div>}
      <input type="search" placeholder="料理名・材料で探す" value={q} onChange={(e) => setQ(e.target.value)} />
      {cats.length > 0 && (
        <div className="chips">
          {['', ...cats].map((c) => (
            <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c || 'すべて'}
            </button>
          ))}
        </div>
      )}
      {loading ? (
        <p className="s">読み込み中…</p>
      ) : shown.length ? (
        shown.map((r) => (
          <a key={r.id} className="rc" href={`#r${r.id}`}>
            {r.img && <img src={r.img} alt="" />}
            <div>
              <b>{r.name}</b>
              <span className="s">{metaOf(r).join(' ・ ')}</span>
            </div>
          </a>
        ))
      ) : (
        <p className="s">見つかりませんでした。</p>
      )}
      <details>
        <summary>CSVファイルを選んで読み込む</summary>
        <p className="s">スプレッドシートを「ファイル→ダウンロード→CSV」で保存して選びます。</p>
        <input type="file" accept=".csv" onChange={pickFile} />
      </details>
    </>
  )
}

function Detail({ r }) {
  useEffect(() => window.scrollTo(0, 0), [])
  return (
    <>
      <a className="back" href="#">← 一覧へ</a>
      {r.img && <img className="hero" src={r.img} alt="" />}
      <h2 className="name">{r.name}</h2>
      <div className="meta">{metaOf(r).map((x) => <span key={x}>{x}</span>)}</div>
      <h3>材料</h3>
      <CheckList items={r.ing} className="ck" as="ul" />
      <h3>作り方</h3>
      <CheckList items={r.steps} className="st" as="ol" />
      {r.tip && (
        <div className="tip">
          <b>コツ</b>
          {r.tip}
        </div>
      )}
    </>
  )
}

/* チェックを付けると線が引かれるリスト（材料・手順の共通部品） */
function CheckList({ items, className, as: Tag }) {
  return (
    <Tag className={className}>
      {items.map((x, i) => (
        <li key={i}>
          <label>
            <input type="checkbox" />
            <span>{x}</span>
          </label>
        </li>
      ))}
    </Tag>
  )
}
