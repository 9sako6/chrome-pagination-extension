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
