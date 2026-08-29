function isEditableTarget(target) {
  return (
    target &&
    typeof target.closest === "function" &&
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  );
}

function isDisabled(element) {
  if (!element) {
    return true;
  }

  return (
    element.disabled === true ||
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

  const control =
    typeof item.click === "function" ||
    item.matches?.('a, button, [role="button"]')
      ? item
      : item.querySelector?.('a, button, [role="button"]');

  return control && !isDisabled(control) && typeof control.click === "function"
    ? control
    : null;
}

function findAdjacentPageControl(activeItem, direction) {
  const siblingProperty =
    direction === "previous" ? "previousElementSibling" : "nextElementSibling";

  for (let item = activeItem[siblingProperty]; item; item = item[siblingProperty]) {
    const control = findControl(item);
    if (control) {
      return control;
    }
  }

  return null;
}

function findAdjacentMatchingControl(activeItem, direction, selector) {
  const siblingProperty =
    direction === "previous" ? "previousElementSibling" : "nextElementSibling";

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

  return {
    findControl(direction) {
      return findAdjacentPageControl(activeItem, direction);
    },
  };
}

function createDirectionalPagination(previousSelector, nextSelector) {
  return {
    findControl(direction) {
      const selector = direction === "previous" ? previousSelector : nextSelector;
      return findControl(document.querySelector(selector));
    },
  };
}

function createScopedDirectionalPagination(
  root,
  previousSelector,
  nextSelector,
) {
  return {
    findControl(direction) {
      const selector = direction === "previous" ? previousSelector : nextSelector;
      return findControl(root.querySelector(selector));
    },
  };
}

function detectDirectionalPagination() {
  const selectorPairs = [
    ["#pnprev", "#pnnext"],
    ["#sb_pagP, .sb_pagP", "#sb_pagN, .sb_pagN"],
    ["#pagination-list #prev-page button", "#pagination-list #next-page button"],
    [".Pagenation__prev a", ".Pagenation__next a"],
    [".compPagination .prev", ".compPagination .next"],
    [
      ".s-pagination-container .s-pagination-previous",
      ".s-pagination-container .s-pagination-next",
    ],
  ];

  for (const [previousSelector, nextSelector] of selectorPairs) {
    if (document.querySelector(previousSelector) || document.querySelector(nextSelector)) {
      return createDirectionalPagination(previousSelector, nextSelector);
    }
  }

  return null;
}

function detectBootstrapPagination() {
  const activeItem =
    document.querySelector(".pagination > li.active") ??
    document.querySelector(".pagination > .page-item.active") ??
    paginationItem(document.querySelector('.pagination [aria-current="page"]'));

  return activeItem ? createSiblingPagination(activeItem) : null;
}

function detectMuiPagination() {
  const activeControl =
    document.querySelector('.MuiPagination-ul [aria-current="page"]') ??
    document.querySelector(".MuiPagination-ul .Mui-selected");
  const activeItem = paginationItem(activeControl);
  if (!activeItem) {
    return null;
  }

  return {
    findControl(direction) {
      return findAdjacentMatchingControl(
        activeItem,
        direction,
        ".MuiPaginationItem-previousNext",
      );
    },
  };
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
  const activeItem = document.querySelector(".pagelink .current")?.closest("li");
  return activeItem ? createSiblingPagination(activeItem) : null;
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
  const previousSelector =
    'a[rel="prev"][href], a[rel="previous"][href]';
  const nextSelector = 'a[rel="next"][href]';
  const adjacentSelector = `${previousSelector}, ${nextSelector}`;
  const currentPage = document.querySelector(
    'nav.pagination [aria-current="page"]',
  );
  const pagination = currentPage?.closest("nav.pagination");
  if (pagination?.querySelector(adjacentSelector)) {
    return createScopedDirectionalPagination(
      pagination,
      previousSelector,
      nextSelector,
    );
  }

  if (!document.querySelector(adjacentSelector)) {
    return null;
  }

  return createDirectionalPagination(previousSelector, nextSelector);
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

function detectPagination() {
  for (const detect of paginationDetectors) {
    const pagination = detect();
    if (pagination) {
      return pagination;
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

  const direction =
    event.key === "ArrowLeft"
      ? "previous"
      : event.key === "ArrowRight"
        ? "next"
        : null;
  if (!direction) {
    return;
  }

  const pagination = detectPagination();
  if (!pagination) {
    return;
  }

  const control = pagination.findControl(direction);
  if (!control) {
    return;
  }

  event.preventDefault();
  control.click();
});
