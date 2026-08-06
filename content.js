function isEditableTarget(target) {
  return (
    target &&
    typeof target.closest === "function" &&
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])',
    )
  );
}

function findAdjacentPageLink(activeItem, direction) {
  const siblingProperty =
    direction === "previous" ? "previousElementSibling" : "nextElementSibling";

  for (let item = activeItem[siblingProperty]; item; item = item[siblingProperty]) {
    if (item.classList.contains("disabled")) {
      continue;
    }

    const link = item.querySelector("a[href]");
    if (link) {
      return link;
    }
  }

  return null;
}

function createSiblingPagination(activeItem) {
  return {
    findLink(direction) {
      return findAdjacentPageLink(activeItem, direction);
    },
  };
}

function detectListPagination() {
  const activeItem = document.querySelector(".pagination > li.active");
  return activeItem ? createSiblingPagination(activeItem) : null;
}

function detectAlgoliaPagination() {
  const activeItem = document.querySelector(
    ".ais-Pagination-item--selected",
  );
  return activeItem ? createSiblingPagination(activeItem) : null;
}

function detectPagelinkPagination() {
  const activeItem = document.querySelector(".pagelink .current")?.closest("li");
  return activeItem ? createSiblingPagination(activeItem) : null;
}

function detectRelPagination() {
  const currentPage = document.querySelector(
    'nav.pagination [aria-current="page"]',
  );
  const pagination = currentPage?.closest("nav.pagination");
  if (
    !pagination ||
    !pagination.querySelector('a[rel="prev"][href], a[rel="next"][href]')
  ) {
    return null;
  }

  return {
    findLink(direction) {
      const relation = direction === "previous" ? "prev" : "next";
      return pagination.querySelector(`a[rel="${relation}"][href]`);
    },
  };
}

const paginationDetectors = [
  detectListPagination,
  detectAlgoliaPagination,
  detectPagelinkPagination,
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

  const link = pagination.findLink(direction);
  if (!link) {
    return;
  }

  event.preventDefault();
  link.click();
});
