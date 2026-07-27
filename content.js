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

function findActivePageItem() {
  const activeItem = document.querySelector(
    ".pagination > li.active, .ais-Pagination-item--selected",
  );
  if (activeItem) {
    return activeItem;
  }

  return document.querySelector(".pagelink .current")?.closest("li") ?? null;
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

  const activeItem = findActivePageItem();
  if (!activeItem) {
    return;
  }

  const link = findAdjacentPageLink(activeItem, direction);
  if (!link) {
    return;
  }

  event.preventDefault();
  link.click();
});
