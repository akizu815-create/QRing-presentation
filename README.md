# つながるQR — プレゼンテーション資料

「つながるQR」のプレゼンテーション資料（HTML/CSS）。HP本体（[QRing](https://github.com/akizu815-create/QRing)）とは別管理のリポジトリです。

## 概要

- 「つながるQR」は、お互いに電話番号を隠したまま、プライバシーを守って通話を開始できる双方向プライバシー保護コミュニケーションツールです。
- マッチングイベント向け（3分間想定）の資料として、表紙＋4枚の本編で構成しています。

## ファイル構成

```
.
├── index.html   # スライドビューア（iframeで各スライドを読み込み、Prev/Nextで切り替え）
├── style.css    # 共通デザイン（フォント・配色・基本レイアウト）
├── s01.html     # スライド1: 表紙
├── s02.html     # スライド2: 課題と解決策
├── s03.html     # スライド3: 仕組みと導入の容易さ
├── s04.html     # スライド4: ユースケースと実績
├── s05.html     # スライド5: 協業提案
└── assets/      # 画像など（必要に応じて追加）
```

スライドを追加する場合は `s06.html` ... の形式で作成し、`index.html` 内の `slides` 配列にファイル名を追記してください。

## デザイン

QRingブランドの視覚言語（プレミアム・ミニマリズム）を継承しています。

- **配色:** ivory / cream / sand / ink / moss / deepmoss / gold / softgold
- **タイポグラフィ:** Cormorant Garamond（英字セリフ）× Noto Serif/Sans JP（和文）
- **モーション:** fade-up / fade-in による控えめな登場アニメーション

## ローカルでの確認方法

```bash
npx serve .
```

ブラウザで `index.html` を開くだけでも確認できます。

## 自治体向け実証提案（試作）

既存の企業マッチング資料は上記のビューアから閲覧できます。自治体向けの試作は `decks/municipal/` に収録しています。外出先で家族に連絡できない場面から始め、つながるQRでの連絡方法と模擬実証の進め方を8枚で示します。

- [HTMLビューア](decks/municipal/output/index.html)
- [編集用PowerPoint](decks/municipal/output/deck.pptx)・[提出用PDF](decks/municipal/output/deck.pdf)
- [全8枚のコンタクトシート](decks/municipal/output/contact-sheet.png)・[各ページのPNG](decks/municipal/output/preview/)
- [デザインガイド](docs/design-guide.md)・[技術検証レポート](docs/technical-review.md)・[出典台帳](docs/sources.md)

### 生成環境

Node.js 20以上、Python 3.10以上、LibreOffice Impress、Noto Sans CJK JP / Noto Serif CJK JP の Regular を用意してください。PPTXの編集端末にも同じフォントを入れると試作品の字形と行幅を再現しやすくなります。

```sh
npm ci
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r tools/requirements.txt
npx playwright install chromium
```

LinuxでChromiumの共有ライブラリが不足する環境では、Playwrightの案内に従いシステム依存パッケージをインストールしてください。既存のChromiumを使う場合は `CHROMIUM`、Impressの実行ファイルがPATHにない場合は `SOFFICE` に実行ファイルのパスを指定できます。

```sh
npm run build -- municipal
npm run render:html -- municipal
npm run export -- municipal
```

`build` は `output/index.html` と `output/deck.pptx` を生成します。`render:html` はChromiumでHTMLを検査し、比較用PDFとPNGを生成します。`export` はPPTXをImpressでPDFに変換し、比較用PDFとページ数・文字を照合してから提出用PDF、各ページのPNG、コンタクトシートを生成します。

HTMLは `decks/municipal/output/index.html` をブラウザで直接開くか、リポジトリ直下で `python3 -m http.server 8000` を起動して `http://localhost:8000/decks/municipal/output/` にアクセスします。写真は隣接する `assets/` から読み込むため、HTMLを共有するときは `municipal/` の階層を保ってください。

### 新しい資料を作る

1. `decks/municipal/` を参考に、`decks/manufacturer/`、`decks/pitch/`、`decks/company/` など、半角英小文字で始まる資料IDのディレクトリを作ります。
2. `deck.cjs` に資料名と `slides` を記入します。配列の順序がページ順です。テキスト、罫線・四角形、写真を960×540の座標で各ページに配置します。日本語の改行は行ごとにテキスト要素を置く方法で指定します。
3. 写真を `assets/` に置きます。小文字の英数字・ハイフンでファイル名を付け、JPGまたはPNGを使います。掲載枠の比率で先にトリミングし、代替テキストと出典を記録します。
4. 上記の3コマンドで `municipal` を新しい資料IDに差し替えて実行し、全ページの表示、コンタクトシート、PPTXの文字と図形を確認します。PPTXで行った編集を次回の生成にも残す場合は、`deck.cjs` に反映してください。既存資料から削除したページの古いプレビュー画像は成果物から取り除いてください。

成果物をレビューに出すときは、`assets/` と `output/` の主要成果物を作業ブランチに含めます。比較用の `html-reference.pdf` と `html-preview/` は再生成できます。
