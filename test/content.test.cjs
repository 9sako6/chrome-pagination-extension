const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const contentScriptPath = path.join(__dirname, "..", "content.js");
const contentScript = fs.existsSync(contentScriptPath)
  ? fs.readFileSync(contentScriptPath, "utf8")
  : "";

function paginationItem({ disabled = false, href = null } = {}) {
  const link = href
    ? {
        href,
        clicks: 0,
        click() {
          this.clicks += 1;
        },
      }
    : null;

  return {
    classList: { contains: (className) => className === "disabled" && disabled },
    link,
    nextElementSibling: null,
    previousElementSibling: null,
    querySelector: () => link,
  };
}

function connect(items) {
  items.forEach((item, index) => {
    item.previousElementSibling = items[index - 1] ?? null;
    item.nextElementSibling = items[index + 1] ?? null;
  });
}

function loadContentScript(activeItem, activeItemSelector = ".pagination > li.active") {
  let keydownHandler;
  const document = {
    addEventListener(type, handler) {
      assert.equal(type, "keydown");
      keydownHandler = handler;
    },
    querySelector(selector) {
      return selector.includes(activeItemSelector) ? activeItem : null;
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

test("右矢印でactiveの直後のページリンクをクリックする", () => {
  const previous = paginationItem({ href: "https://example.com/?page=10" });
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=12" });
  connect([previous, active, next]);

  const event = keyboardEvent("ArrowRight");
  loadContentScript(active)(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(previous.link.clicks, 0);
  assert.equal(event.prevented, true);
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
  loadContentScript(active, ".ais-Pagination-item--selected")(event);

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
      assert.equal(selector, "li");
      return active;
    },
  };

  const event = keyboardEvent("ArrowRight");
  loadContentScript(currentMarker, ".pagelink .current")(event);

  assert.equal(next.link.clicks, 1);
  assert.equal(event.prevented, true);
});

test("左矢印で空要素とdisabled要素を飛ばして前のリンクをクリックする", () => {
  const previous = paginationItem({ href: "https://example.com/?page=10" });
  const disabled = paginationItem({ disabled: true });
  const empty = paginationItem();
  const active = paginationItem();
  connect([previous, disabled, empty, active]);

  loadContentScript(active)(keyboardEvent("ArrowLeft"));

  assert.equal(previous.link.clicks, 1);
});

test("入力可能な要素にフォーカス中は何もしない", () => {
  const active = paginationItem();
  const next = paginationItem({ href: "https://example.com/?page=12" });
  connect([active, next]);

  const event = keyboardEvent("ArrowRight", {
    target: { closest: () => ({ tagName: "INPUT" }) },
  });
  loadContentScript(active)(event);

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
    loadContentScript(active)(event);
    assert.equal(next.link.clicks, 0);
  }
});

test("移動先がない場合は既定動作を妨げない", () => {
  const event = keyboardEvent("ArrowLeft");
  loadContentScript(paginationItem())(event);

  assert.equal(event.prevented, false);
});
