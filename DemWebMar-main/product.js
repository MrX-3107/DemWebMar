function changeImage(element) {
  document.getElementById("mainImage").src = element.src;
  document
    .querySelectorAll(".product-gallery__thumbs img")
    .forEach((img) => img.classList.remove("is-active"));
  element.classList.add("is-active");
}

document.querySelectorAll("a.product-card[data-category]").forEach((link) => {
  const productId = new URL(link.href, window.location.href).searchParams.get("id");
  if (!productId) return;

  const card = document.createElement("article");
  card.className = "product-card";
  card.dataset.category = link.dataset.category;

  const detailLink = document.createElement("a");
  detailLink.className = "product-card__link";
  detailLink.href = link.href;
  detailLink.append(...link.childNodes);

  const buyButton = document.createElement("button");
  buyButton.type = "button";
  buyButton.className = "product-card__buy";
  buyButton.dataset.productId = productId;
  buyButton.textContent = "Mua ngay";

  card.append(detailLink, buyButton);
  link.replaceWith(card);
});

document.querySelectorAll(".product-card__buy").forEach((button) => {
  button.addEventListener("click", () => {
    window.location.href = `order.html?productId=${encodeURIComponent(button.dataset.productId)}`;
  });
});

const categoryMenu = document.querySelector(".product-nav-item");
if (categoryMenu) {
  categoryMenu.addEventListener("mouseenter", () => {
    categoryMenu.open = true;
  });
  categoryMenu.addEventListener("mouseleave", () => {
    categoryMenu.open = false;
  });

  const categoryButtons = categoryMenu.querySelectorAll("[data-category]");
  const productCards = document.querySelectorAll(".product-card[data-category]");

  categoryButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const selectedCategory = button.dataset.category;

      productCards.forEach((card) => {
        card.hidden =
          selectedCategory !== "all" &&
          !card.dataset.category.split(/\s+/).includes(selectedCategory);
      });

      categoryButtons.forEach((categoryButton) => {
        categoryButton.classList.toggle(
          "is-selected",
          categoryButton === button,
        );
      });

      categoryMenu.open = false;
    });
  });
}

function selectColor(element) {
  document
    .querySelectorAll(".swatch")
    .forEach((s) => s.classList.remove("is-selected"));
  element.classList.add("is-selected");
  document.getElementById("selectedColorName").innerText =
    element.getAttribute("data-name");
}

function adjustQty(amount) {
  const input = document.getElementById("quantity");
  let val = parseInt(input.value) + amount;
  if (val < 1) val = 1;
  input.value = val;
}

const addBtn = document.getElementById("addToCartBtn");
if (addBtn) {
  addBtn.addEventListener("click", () => {
    const toast = document.getElementById("toast");
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  });
}
