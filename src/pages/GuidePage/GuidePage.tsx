import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePageHeader } from '../../contexts/PageHeaderContext'
import styles from './GuidePage.module.css'

interface GuideSectionProps {
  title: string
  /** 最初から開いておくか。開いた状態で置くのは「はじめに」だけ */
  defaultOpen?: boolean
  children: ReactNode
}

/** 開閉できる1セクション。JS を挟まず details/summary に任せる（キーボードでも開ける） */
function GuideSection({ title, defaultOpen = false, children }: GuideSectionProps) {
  return (
    <details className={styles.section} open={defaultOpen}>
      <summary className={styles.summary}>{title}</summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}

export default function GuidePage() {
  const navigate = useNavigate()
  const { setHeader } = usePageHeader()

  useEffect(() => {
    setHeader({
      title: '使い方',
      centered: true,
      // navigate(-1) だと直接URLを開いたときアプリ外へ戻るため、遷移先を明示する
      leftElement: (
        <button className="header-icon-btn" aria-label="戻る" onClick={() => navigate('/settings')}>
          <ChevronLeft size={24} />
        </button>
      ),
    })
  }, [setHeader, navigate])

  return (
    <div className={styles.page}>
      <GuideSection title="はじめに" defaultOpen>
        <p className={styles.paragraph}>
          Strength Log
          は、筋力トレーニングの記録アプリです。日々のセット（重量 × 回数）を記録すると、推定1RM・継続日数・体組成の推移が自動で計算されます。
        </p>
        <p className={styles.paragraph}>
          アカウント登録は不要です。
          <strong className={styles.strong}>
            記録はお使いの端末の中だけに保存され、外部には送信されません。
          </strong>
        </p>
      </GuideSection>

      <GuideSection title="トレーニングを記録する">
        <ol className={styles.orderedList}>
          <li>ホームのカレンダーで、記録したい日をタップします</li>
          <li>右下の「＋」をタップして、部位から種目を選びます</li>
          <li>重量と回数を入力します。入力欄から指を離した時点で保存されます</li>
        </ol>
        <h3 className={styles.subTitle}>入力のヒント</h3>
        <ul className={styles.list}>
          <li>
            上部に「Last Record」として前回の記録が出ます。前回より重くする、回数を増やす、の判断に使ってください
          </li>
          <li>セットが足りないときは「＋ セットを追加」。要らない行は右端の「×」で消せます</li>
          <li>各セットにメモを残せます（「ベルトあり」「フォーム良好」など）</li>
          <li>自重の種目は、重量を 0 のままで回数だけ入れてください。記録として正しく数えられます</li>
        </ul>
      </GuideSection>

      <GuideSection title="継続力ゲージの仕組み">
        <p className={styles.paragraph}>
          このアプリ独自の指標で、「続けられているか」を1本のゲージで表します。
        </p>
        <h3 className={styles.subTitle}>+1 される条件</h3>
        <p className={styles.paragraph}>
          1日のうちに、
          <strong className={styles.strong}>「継続達成セット数」以上こなした種目</strong>
          が、
          <strong className={styles.strong}>「継続達成種目数」以上</strong>
          あると、その日が達成となりゲージが +1 されます。初期設定はどちらも 3
          なので、「3セット以上やった種目が3つ以上ある日」が達成です。
        </p>
        <ul className={styles.list}>
          <li>同じ日に何種目やっても、増えるのは +1 までです</li>
          <li>回数が 0 のセットは数えません（画面を開いただけ、では増えません）</li>
          <li>
            条件は設定画面の「継続達成種目数」「継続達成セット数」で変えられます。自分のペースに合わせて下げても構いません
          </li>
        </ul>
        <h3 className={styles.subTitle}>リセットされる条件</h3>
        <p className={styles.paragraph}>
          達成した日から <strong className={styles.strong}>10日</strong> 空くと 0
          に戻ります。週1〜2回のペースなら維持できる余裕を持たせています。
        </p>
        <h3 className={styles.subTitle}>満タンは 90</h3>
        <p className={styles.paragraph}>
          ゲージは 90 で満タンです。溜まるにつれて色が変わります（青 → 緑 → 黄 → 紫 → 赤 → 虹）。90
          に到達すると「継続力MAX」の表示になります。
        </p>
      </GuideSection>

      <GuideSection title="1RM（推定値）とトロフィー">
        <p className={styles.paragraph}>
          <strong className={styles.strong}>1RM</strong>{' '}
          は「1回だけ挙げられる最大重量」の推定値です。実際に1回挑戦しなくても、いつもの重量と回数から計算できます。
        </p>
        <p className={styles.paragraph}>
          計算には Epley の式（<code className={styles.code}>重量 × (1 + 回数 ÷ 30)</code>
          ）を使っています。あくまで推定値なので、目安として見てください。
        </p>
        <p className={styles.paragraph}>
          種目ごとの自己ベストを更新すると、記録画面で演出が出ます。更新した記録はホームの「1RM更新」に新しい順で並びます。
        </p>
      </GuideSection>

      <GuideSection title="履歴の見方">
        <p className={styles.paragraph}>下のタブから「履歴」を開きます。</p>
        <ul className={styles.list}>
          <li>
            上段で<strong className={styles.strong}>部位</strong>、下段で
            <strong className={styles.strong}>種目</strong>を絞り込めます
          </li>
          <li>
            「カレンダー」と「グラフ」を切り替えられます。カレンダーで日付をタップすると、その日の内容が出ます
          </li>
        </ul>
        <h3 className={styles.subTitle}>4つのグラフ</h3>
        <dl className={styles.termList}>
          <dt className={styles.term}>最大重量</dt>
          <dd className={styles.description}>その日に扱った一番重い重量</dd>
          <dt className={styles.term}>最大RM</dt>
          <dd className={styles.description}>その日の推定1RMの最高値</dd>
          <dt className={styles.term}>セット数</dt>
          <dd className={styles.description}>その日にこなしたセットの合計</dd>
          <dt className={styles.term}>総負荷量</dt>
          <dd className={styles.description}>重量 × 回数 をすべて足した値。トレーニング量の目安</dd>
        </dl>
        <p className={styles.paragraph}>
          重量が伸びていなくても、回数やセット数が増えていれば総負荷量は伸びます。調子を測るときは複数のグラフを見てください。
        </p>
      </GuideSection>

      <GuideSection title="体組成を記録する">
        <p className={styles.paragraph}>下のタブから「体組成」を開きます。</p>
        <ol className={styles.orderedList}>
          <li>「基本情報」に身長と目標値を入れます（最初に1回だけ）</li>
          <li>「計測値」に体重・体脂肪率・筋肉量・腹囲を入れます。入れた項目だけで構いません</li>
          <li>BMI・体脂肪量・除脂肪体重・筋重量は自動で計算されます</li>
        </ol>
        <p className={styles.paragraph}>
          ホームには体重と体脂肪率の推移グラフが出ます。目標値を設定していれば、基準線として表示されます。
        </p>
      </GuideSection>

      <GuideSection title="種目を追加する・消す">
        <p className={styles.paragraph}>
          種目を選ぶ画面の「部位・種目を追加」から、自分の種目を登録できます。部位は自由に入力できるので、既にある部位名（胸・背中など）を入れればそこに追加され、新しい名前を入れれば新しい部位ができます。
        </p>
        <h3 className={styles.subTitle}>消すときの注意</h3>
        <p className={styles.paragraph}>
          編集モードの「－」で種目を消すと、
          <strong className={styles.strong}>
            その種目の過去の記録は、カレンダーの印・継続力ゲージ・履歴・日付の詳細から外れます
          </strong>
          。削除前に確認が出るので、記録件数を見てから判断してください。記録を残したい種目は消さないでください。
        </p>
      </GuideSection>

      <GuideSection title="設定でできること">
        <dl className={styles.termList}>
          <dt className={styles.term}>継続達成種目数</dt>
          <dd className={styles.description}>継続力ゲージが +1 される「種目数」の条件</dd>
          <dt className={styles.term}>継続達成セット数</dt>
          <dd className={styles.description}>同じく「1種目あたりのセット数」の条件</dd>
          <dt className={styles.term}>デフォルトセット数</dt>
          <dd className={styles.description}>記録画面を開いたときに並ぶ入力欄の数</dd>
          <dt className={styles.term}>重量単位</dt>
          <dd className={styles.description}>
            kg と lbs を切り替えます。保存されている値は常に kg で、表示だけが変わります
          </dd>
        </dl>
      </GuideSection>

      <GuideSection title="データについて（大切）">
        <p className={styles.paragraph}>
          <strong className={styles.strong}>
            記録はお使いの端末のブラウザの中だけに保存されます。
          </strong>
          サーバーには何も送っていないので、他の人に見られることはありません。その代わり、次の場合は記録が消えます。
        </p>
        <ul className={styles.list}>
          <li>ブラウザの履歴やサイトデータを削除したとき</li>
          <li>別の端末・別のブラウザで開いたとき（同じ端末でも Safari と Chrome は別扱いです）</li>
        </ul>
        <h3 className={styles.subTitle}>機種変更や、消えたときに備えて</h3>
        <p className={styles.paragraph}>
          設定画面の「データを書き出す」で、記録をファイルとして保存できます。新しい端末では「バックアップから復元」でそのファイルを選べば、元に戻せます。
          <strong className={styles.strong}>月に1回ほど書き出しておくことをおすすめします。</strong>
        </p>
        <p className={styles.paragraph}>
          「全データをリセット」は、この端末の記録をすべて消します。元に戻せないので、実行前に書き出しておいてください。
        </p>
      </GuideSection>
    </div>
  )
}
