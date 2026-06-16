# つながるQR — プレゼンテーション資料

「つながるQR」のプレゼンテーション資料（HTML/CSS）。HP本体（[QRing](https://github.com/akizu815-create/QRing)）とは別管理のリポジトリです。

## 概要

- 「つながるQR」は、お互いに電話番号を隠したまま、プライバシーを守って通話を開始できる双方向プライバシー保護コミュニケーションツールです。
- ターゲットや用途に応じ、短く簡潔なスライド構成で資料化しています。

## ファイル構成

```
.
├── index.html   # スライドビューア（iframeで各スライドを読み込み、Prev/Nextで切り替え）
├── style.css    # 共通デザイン（フォント・配色・基本レイアウト）
├── s01.html     # スライド1: タイトル
└── assets/      # 画像など（必要に応じて追加）
```

スライドを追加する場合は `s02.html`, `s03.html` ... の形式で作成し、`index.html` 内の `slides` 配列にファイル名を追記してください。

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
