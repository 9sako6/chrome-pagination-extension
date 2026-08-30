const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const contentScriptPath = path.join(__dirname, "..", "content.js");
const contentScript = fs.readFileSync(contentScriptPath, "utf8");

function paginationItem({ disabled = false, href = null } = {}) {
  const link = href
    ? {
        href,
        clicks: 0,
        matches: (selector) => selector === 'a, button, [role="button"]',
        click() {
          this.clicks += 1;
        },
      }
    : null;

  return {
    classList: { contains: (className) => className === "disabled" && disabled },
    clicks: 0,
    link,
    matches: () => false,
    nextElementSibling: null,
    previousElementSibling: null,
    querySelector: () => link,
    click() {
      this.clicks += 1;
    },
  };
}

function muiPaginationItem({ control = false, disabled = false } = {}) {
  const button = {
    disabled,
    clicks: 0,
    matches: (selector) => selector.includes("button"),
    click() {
      this.clicks += 1;
    },
  };

  return {
    button,
    nextElementSibling: null,
    previousElementSibling: null,
    querySelector: (selector) =>
      control && selector === ".MuiPaginationItem-previousNext" ? button : null,
  };
}

function connect(items) {
  items.forEach((item, index) => {
    item.previousElementSibling = items[index - 1] ?? null;
    item.nextElementSibling = items[index + 1] ?? null;
  });
}

function loadContentScript(selectorEntries) {
  let keydownHandler;
  const elements = new Map(selectorEntries);
  const document = {
    addEventListener(type, handler) {
      assert.equal(type, "keydown");
      keydownHandler = handler;
    },
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };

  vm.runInNewContext(contentScript, { document });
  assert.equal(typeof keydownHandler, "function", "keydown listener must be registered");
  return keydownHandler;
}

function keyboardEvent(key, overrides = {}) {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    isComposing: false,
    metaKey: false,
    shiftKey: false,
    prevented: false,
    target: { closest: () => null },
    preventDefault() {
      this.prevented = true;
    },
    ...overrides,
  };
}

function clickableControl({
  ariaDisabled = null,
  disabled = false,
  effectivelyDisabled = false,
} = {}) {
  return {
    clicks: 0,
    disabled,
    getAttribute(name) {
      return name === "aria-disabled" ? ariaDisabled : null;
    },
    matches: (selector) =>
      selector === ":disabled" ? effectivelyDisabled : selector.includes("button"),
    click() {
      this.clicks += 1;
    },
  };
}

test("右矢印でactiveの直後のページリンクをクリックする", () => {
  const previous = paginationItem({ href: "https://example.com/?page=10" });
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=12" });
  connect([previous, active, next]);

  const event = keyboardEvent("ArrowRight");
  loadContentScript([[".pagination > li.active", active]])(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(next.clicks, 0);
  assert.equal(previous.link.clicks, 0);
  assert.equal(event.prevented, true);
});

test("pagination内のulにネストしたactiveから次ページへ移動する", () => {
  const previous = paginationItem();
  const active = paginationItem();
  const next = paginationItem({
    href: "https://example.com/category/items/page/2",
  });
  connect([previous, active, next]);

  const event = keyboardEvent("ArrowRight");
  loadContentScript([[".pagination > ul > li.active", active]])(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("paginationのprev-pageとnext-pageで前後へ移動する", () => {
  const previous = clickableControl();
  const next = clickableControl();
  const keydownHandler = loadContentScript([
    [".pagination .prev-page a", previous],
    [".pagination .next-page a", next],
  ]);

  const previousEvent = keyboardEvent("ArrowLeft");
  const nextEvent = keyboardEvent("ArrowRight");
  keydownHandler(previousEvent);
  keydownHandler(nextEvent);

  assert.equal(previous.clicks, 1);
  assert.equal(next.clicks, 1);
  assert.equal(previousEvent.prevented, true);
  assert.equal(nextEvent.prevented, true);
});

test("Algolia InstantSearchのselected項目から右矢印で次ページへ移動する", () => {
  const active = paginationItem({
    href: "https://example.com/?categories=FURNITURE&page=8",
  });
  const next = paginationItem({
    href: "https://example.com/?categories=FURNITURE&page=9",
  });
  connect([active, next]);

  const event = keyboardEvent("ArrowRight");
  loadContentScript([[".ais-Pagination-item--selected", active]])(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("pagelink内のcurrent項目から右矢印で次ページへ移動する", () => {
  const active = paginationItem();
  const next = paginationItem({
    href: "https://example.com/?request=page&next_page=3",
  });
  connect([active, next]);
  const currentMarker = {
    closest(selector) {
      assert.equal(selector, 'li, [role="listitem"]');
      return active;
    },
  };

  const event = keyboardEvent("ArrowRight");
  loadContentScript([[".pagelink .current", currentMarker]])(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("MUI PaginationのMui-selectedから前後のボタンをクリックする", () => {
  const previousControl = muiPaginationItem({ control: true });
  const firstPage = muiPaginationItem();
  const ellipsis = muiPaginationItem();
  const active = muiPaginationItem();
  const nextPage = muiPaginationItem();
  const nextControl = muiPaginationItem({ control: true });
  connect([previousControl, firstPage, ellipsis, active, nextPage, nextControl]);
  const selectedButton = {
    closest(selector) {
      assert.equal(selector, 'li, [role="listitem"]');
      return active;
    },
  };

  const keydownHandler = loadContentScript([
    [".MuiPagination-ul .Mui-selected", selectedButton],
  ]);
  const nextEvent = keyboardEvent("ArrowRight");
  const previousEvent = keyboardEvent("ArrowLeft");
  keydownHandler(nextEvent);
  keydownHandler(previousEvent);

  assert.equal(nextControl.button.clicks, 1);
  assert.equal(previousControl.button.clicks, 1);
  assert.equal(nextPage.button.clicks, 0);
  assert.equal(nextEvent.prevented, true);
  assert.equal(previousEvent.prevented, true);
});

test("MUI Paginationの無効なボタンには移動しない", () => {
  const previousControl = muiPaginationItem({ control: true, disabled: true });
  const active = muiPaginationItem();
  connect([previousControl, active]);
  const selectedButton = {
    closest: () => active,
  };

  const event = keyboardEvent("ArrowLeft");
  loadContentScript([[".MuiPagination-ul .Mui-selected", selectedButton]])(event);

  assert.equal(previousControl.button.clicks, 0);
  assert.equal(event.prevented, false);
});

test("左矢印で空要素とdisabled要素を飛ばして前のリンクをクリックする", () => {
  const previous = paginationItem({ href: "https://example.com/?page=10" });
  const disabled = paginationItem({ disabled: true });
  const empty = paginationItem();
  const active = paginationItem();
  connect([previous, disabled, empty, active]);

  loadContentScript([[".pagination > li.active", active]])(
    keyboardEvent("ArrowLeft"),
  );

  assert.equal(previous.link.clicks, 1);
});

test("入力可能な要素にフォーカス中は何もしない", () => {
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=12" });
  connect([active, next]);

  const event = keyboardEvent("ArrowRight", {
    target: { closest: () => ({ tagName: "INPUT" }) },
  });
  loadContentScript([[".pagination > li.active", active]])(event);

  assert.equal(next.link.clicks, 0);
  assert.equal(event.prevented, false);
});

test("修飾キー、IME変換、処理済みイベントは無視する", () => {
  const ignoredEvents = [
    keyboardEvent("ArrowRight", { altKey: true }),
    keyboardEvent("ArrowRight", { ctrlKey: true }),
    keyboardEvent("ArrowRight", { metaKey: true }),
    keyboardEvent("ArrowRight", { shiftKey: true }),
    keyboardEvent("ArrowRight", { isComposing: true }),
    keyboardEvent("ArrowRight", { defaultPrevented: true }),
  ];

  for (const event of ignoredEvents) {
    const active = paginationItem();
    const next = paginationItem({ href: "https://example.com/?page=12" });
    connect([active, next]);
    loadContentScript([[".pagination > li.active", active]])(event);
    assert.equal(next.link.clicks, 0);
  }
});

test("移動先がない場合は既定動作を妨げない", () => {
  const event = keyboardEvent("ArrowLeft");
  loadContentScript([[".pagination > li.active", paginationItem()]])(event);

  assert.equal(event.prevented, false);
});

test("矢印以外のキーでは移動しない", () => {
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=2" });
  connect([active, next]);

  const event = keyboardEvent("Enter");
  loadContentScript([[".pagination > li.active", active]])(event);

  assert.equal(next.link.clicks, 0);
  assert.equal(event.prevented, false);
});

test("aria-currentとrelを持つページネーションで前後へ移動する", () => {
  const previous = paginationItem({ href: "https://example.com/?page=2" });
  const next = paginationItem({ href: "https://example.com/?page=4" });
  const pagination = {
    querySelector(selector) {
      if (
        selector === 'a[rel="prev"][href], a[rel="previous"][href]'
      ) {
        return previous.link;
      }
      if (selector === 'a[rel="next"][href]') {
        return next.link;
      }
      return null;
    },
  };
  const currentPage = {
    closest(selector) {
      assert.equal(selector, "nav.pagination");
      return pagination;
    },
  };

  const keydownHandler = loadContentScript([
    ['nav.pagination [aria-current="page"]', currentPage],
  ]);
  const previousEvent = keyboardEvent("ArrowLeft");
  const nextEvent = keyboardEvent("ArrowRight");
  keydownHandler(previousEvent);
  keydownHandler(nextEvent);

  assert.equal(next.link.clicks, 1);
  assert.equal(previous.link.clicks, 1);
  assert.equal(previousEvent.prevented, true);
  assert.equal(nextEvent.prevented, true);
});

test("判定済みの形式に移動先がなくても別形式へフォールバックしない", () => {
  const listPrevious = paginationItem({
    href: "https://example.com/list?page=1",
  });
  const listActive = paginationItem();
  connect([listPrevious, listActive]);

  const algoliaNext = paginationItem({
    href: "https://example.com/algolia?page=3",
  });
  const algoliaActive = paginationItem();
  connect([algoliaActive, algoliaNext]);

  const event = keyboardEvent("ArrowRight");
  loadContentScript([
    [".pagination > li.active", listActive],
    [".ais-Pagination-item--selected", algoliaActive],
  ])(event);

  assert.equal(listPrevious.link.clicks, 0);
  assert.equal(algoliaNext.link.clicks, 0);
  assert.equal(event.prevented, false);
});

test("上位サイト固有の前後コントロールを操作する", () => {
  const selectorPairs = [
    ["#pnprev", "#pnnext"],
    ["#sb_pagP, .sb_pagP", "#sb_pagN, .sb_pagN"],
    ["#pagination-list #prev-page button", "#pagination-list #next-page button"],
    [".pagination .prev-page a", ".pagination .next-page a"],
    [".Pagenation__prev a", ".Pagenation__next a"],
    [".compPagination .prev", ".compPagination .next"],
    [
      ".s-pagination-container .s-pagination-previous",
      ".s-pagination-container .s-pagination-next",
    ],
  ];

  for (const [previousSelector, nextSelector] of selectorPairs) {
    const previous = clickableControl();
    const next = clickableControl();
    const keydownHandler = loadContentScript([
      [previousSelector, previous],
      [nextSelector, next],
    ]);

    keydownHandler(keyboardEvent("ArrowLeft"));
    keydownHandler(keyboardEvent("ArrowRight"));

    assert.equal(previous.clicks, 1, previousSelector);
    assert.equal(next.clicks, 1, nextSelector);
  }
});

test("aria-disabledのサイト固有コントロールは操作しない", () => {
  const previous = clickableControl({ ariaDisabled: "true" });
  const next = clickableControl();
  const keydownHandler = loadContentScript([
    ["#pagination-list #prev-page button", previous],
    ["#pagination-list #next-page button", next],
  ]);

  const previousEvent = keyboardEvent("ArrowLeft");
  const nextEvent = keyboardEvent("ArrowRight");
  keydownHandler(previousEvent);
  keydownHandler(nextEvent);

  assert.equal(previous.clicks, 0);
  assert.equal(next.clicks, 1);
  assert.equal(previousEvent.prevented, false);
  assert.equal(nextEvent.prevented, true);
});

test("祖先の状態によって無効なネイティブコントロールは操作しない", () => {
  const previous = clickableControl({ effectivelyDisabled: true });
  const next = clickableControl();
  const keydownHandler = loadContentScript([
    ["#pagination-list #prev-page button", previous],
    ["#pagination-list #next-page button", next],
  ]);

  const event = keyboardEvent("ArrowLeft");
  keydownHandler(event);

  assert.equal(previous.clicks, 0);
  assert.equal(next.clicks, 0);
  assert.equal(event.prevented, false);
});

test("MUIのaria-current項目からbutton型の次ページを操作する", () => {
  const activeItem = paginationItem();
  const nextItem = paginationItem();
  nextItem.link = clickableControl();
  nextItem.querySelector = () => nextItem.link;
  connect([activeItem, nextItem]);
  const activeControl = {
    closest(selector) {
      assert.equal(selector, 'li, [role="listitem"]');
      return activeItem;
    },
  };

  const event = keyboardEvent("ArrowRight");
  loadContentScript([
    ['.MuiPagination-ul [aria-current="page"]', activeControl],
  ])(event);

  assert.equal(nextItem.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("Ant Designのactive項目から次ページを操作する", () => {
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=2" });
  connect([active, next]);

  const event = keyboardEvent("ArrowRight");
  loadContentScript([[".ant-pagination-item-active", active]])(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("上位サイトの現在ページ項目から隣のページを操作する", () => {
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=2" });
  connect([active, next]);
  const selector = [
    ".Pager .Pager-Item_current",
    ".Pagenation__page strong",
    '#page [aria-current="page"]',
    "#page strong",
    '.sc_page_inner [aria-current="page"]',
  ].join(", ");

  const event = keyboardEvent("ArrowRight");
  loadContentScript([[selector, active]])(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("rel=previousとrel=nextの前後リンクを操作する", () => {
  const previous = clickableControl();
  const next = clickableControl();
  const keydownHandler = loadContentScript([
    ['a[rel="prev"][href], a[rel="previous"][href]', previous],
    ['a[rel="next"][href]', next],
  ]);

  keydownHandler(keyboardEvent("ArrowLeft"));
  keydownHandler(keyboardEvent("ArrowRight"));

  assert.equal(previous.clicks, 1);
  assert.equal(next.clicks, 1);
});
