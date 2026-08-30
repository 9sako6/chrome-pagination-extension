function isEditableTarget(target) {
  return (
    target &&
    typeof target.closest === "function" &&
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  );
}

const controlSelector = 'a, button, [role="button"]';

const navigationByKey = new Map([
  [
    "ArrowLeft",
    {
      controlIndex: 0,
      siblingProperty: "previousElementSibling",
    },
  ],
  [
    "ArrowRight",
    {
      controlIndex: 1,
      siblingProperty: "nextElementSibling",
    },
  ],
]);

function isDisabled(element) {
  if (!element) {
    return true;
  }

  return (
    element.disabled === true ||
    element.matches?.(":disabled") ||
    element.getAttribute?.("aria-disabled") === "true" ||
    element.classList?.contains("disabled") ||
    element.classList?.contains("Mui-disabled") ||
    element.classList?.contains("ant-pagination-disabled")
  );
}

function findControl(item) {
  if (!item || isDisabled(item)) {
    return null;
  }

  const control = item.matches?.(controlSelector)
    ? item
    : item.querySelector?.(controlSelector);

  return control && !isDisabled(control) && typeof control.click === "function"
    ? control
    : null;
}

function findAdjacentPageControl(activeItem, navigation) {
  const { siblingProperty } = navigation;
  for (let item = activeItem[siblingProperty]; item; item = item[siblingProperty]) {
    const control = findControl(item);
    if (control) {
      return control;
    }
  }

  return null;
}

function findAdjacentMatchingControl(activeItem, navigation, selector) {
  const { siblingProperty } = navigation;
  for (let item = activeItem[siblingProperty]; item; item = item[siblingProperty]) {
    const control = findControl(item.querySelector?.(selector));
    if (control) {
      return control;
    }
  }

  return null;
}

function paginationItem(control) {
  return control?.closest?.('li, [role="listitem"]') ?? control;
}

function createSiblingPagination(activeControl) {
  const activeItem = paginationItem(activeControl);

  return (navigation) => findAdjacentPageControl(activeItem, navigation);
}

function detectDirectionalPaginationWithin(root, selectorPairs) {
  for (const selectors of selectorPairs) {
    const controls = selectors.map((selector) => root.querySelector(selector));
    if (controls.some(Boolean)) {
      return (navigation) => findControl(controls[navigation.controlIndex]);
    }
  }

  return null;
}

function detectDirectionalPagination() {
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

  return detectDirectionalPaginationWithin(document, selectorPairs);
}

function detectBootstrapPagination() {
  const activeControl =
    document.querySelector(".pagination > li.active") ??
    document.querySelector(".pagination > ul > li.active") ??
    document.querySelector(".pagination > .page-item.active") ??
    document.querySelector('.pagination [aria-current="page"]');

  return activeControl ? createSiblingPagination(activeControl) : null;
}

function detectMuiPagination() {
  const activeControl =
    document.querySelector('.MuiPagination-ul [aria-current="page"]') ??
    document.querySelector(".MuiPagination-ul .Mui-selected");
  const activeItem = paginationItem(activeControl);
  if (!activeItem) {
    return null;
  }

  return (navigation) =>
    findAdjacentMatchingControl(
      activeItem,
      navigation,
      ".MuiPaginationItem-previousNext",
    );
}

function detectAntDesignPagination() {
  const activeItem = document.querySelector(".ant-pagination-item-active");
  return activeItem ? createSiblingPagination(activeItem) : null;
}

function detectAlgoliaPagination() {
  const activeItem = document.querySelector(".ais-Pagination-item--selected");
  return activeItem ? createSiblingPagination(activeItem) : null;
}

function detectPagelinkPagination() {
  const activeControl = document.querySelector(".pagelink .current");
  return activeControl ? createSiblingPagination(activeControl) : null;
}

function detectKnownSitePagination() {
  const activeControl = document.querySelector(
    [
      ".Pager .Pager-Item_current",
      ".Pagenation__page strong",
      '#page [aria-current="page"]',
      "#page strong",
      '.sc_page_inner [aria-current="page"]',
    ].join(", "),
  );

  return activeControl ? createSiblingPagination(activeControl) : null;
}

function detectRelPagination() {
  const selectorPairs = [
    [
      'a[rel="prev"][href], a[rel="previous"][href]',
      'a[rel="next"][href]',
    ],
  ];
  const currentPage = document.querySelector(
    'nav.pagination [aria-current="page"]',
  );
  const pagination = currentPage?.closest("nav.pagination");
  if (pagination) {
    const scopedPagination = detectDirectionalPaginationWithin(
      pagination,
      selectorPairs,
    );
    if (scopedPagination) {
      return scopedPagination;
    }
  }

  return detectDirectionalPaginationWithin(document, selectorPairs);
}

const paginationDetectors = [
  detectDirectionalPagination,
  detectBootstrapPagination,
  detectMuiPagination,
  detectAntDesignPagination,
  detectAlgoliaPagination,
  detectPagelinkPagination,
  detectKnownSitePagination,
  detectRelPagination,
];

function findPaginationControl(navigation) {
  for (const detect of paginationDetectors) {
    const resolveControl = detect();
    if (resolveControl) {
      return resolveControl(navigation);
    }
  }

  return null;
}

document.addEventListener("keydown", (event) => {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    isEditableTarget(event.target)
  ) {
    return;
  }

  const navigation = navigationByKey.get(event.key);
  if (!navigation) {
    return;
  }

  const control = findPaginationControl(navigation);
  if (!control) {
    return;
  }

  event.preventDefault();
  control.click();
});
