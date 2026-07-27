# Keyboard Pagination

Webサイトのページネーションを左右の矢印キーで操作する、自分用のChrome拡張です。

## 現在の対応形式

次のように、`.pagination` 直下の `li.active` が現在ページを表すDOMに対応しています。

```html
<ul class="pagination">
  <li><a href="?page=10">10</a></li>
  <li class="active"><span>11</span></li>
  <li><a href="?page=12">12</a></li>
</ul>
```

Algolia InstantSearchの `.ais-Pagination-item--selected` が現在ページを表すDOMにも対応しています。

```html
<ul class="ais-Pagination-list">
  <li class="ais-Pagination-item ais-Pagination-item--page">
    <a class="ais-Pagination-link" href="?page=7">7</a>
  </li>
  <li class="ais-Pagination-item ais-Pagination-item--page ais-Pagination-item--selected">
    <a class="ais-Pagination-link" href="?page=8">8</a>
  </li>
  <li class="ais-Pagination-item ais-Pagination-item--page">
    <a class="ais-Pagination-link" href="?page=9">9</a>
  </li>
</ul>
```

`.pagelink` 内の `.current` が現在ページを表すDOMにも対応しています。

```html
<div class="pagelink">
  <ul>
    <li><a href="?next_page=1">1</a></li>
    <li><span class="current">2</span></li>
    <li><a href="?next_page=3">3</a></li>
  </ul>
</div>
```

- `←`: 現在ページより前にある最初のリンクへ移動
- `→`: 現在ページより後にある最初のリンクへ移動
- 空の要素と `.disabled` は読み飛ばす

入力欄、テキストエリア、セレクトボックス、`contenteditable` の操作中は反応しません。修飾キーとの同時押し、IME変換中、ほかの処理が消費したキーイベントも無視します。

## インストール

1. Chromeで `chrome://extensions` を開く
2. 「デベロッパー モード」を有効にする
3. 「パッケージ化されていない拡張機能を読み込む」を選ぶ
4. このリポジトリのディレクトリを指定する

## テスト

Node.js以外の依存はありません。

```sh
npm test
```
