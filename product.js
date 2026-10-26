function changeImage(element) {
  document.getElementById("mainImage").src = element.src;
  document
    .querySelectorAll(".product-gallery__thumbs img")
    .forEach((img) => img.classList.remove("is-active"));
  element.classList.add("is-active");
}

const PRODUCT_COLORS = [
  { name: "Trắng kem", swatch: "product-card__swatch--cream" },
  { name: "Hồng pastel", swatch: "product-card__swatch--pink" },
  { name: "Xanh dương", swatch: "product-card__swatch--blue" },
  { name: "Xanh lá", swatch: "product-card__swatch--green" },
];

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

  let selectedColor = PRODUCT_COLORS[0].name;
  const colorPicker = document.createElement("div");
  colorPicker.className = "product-card__color-picker";
  colorPicker.setAttribute("role", "group");
  colorPicker.setAttribute("aria-label", "Chọn màu sản phẩm");

  const colorHeading = document.createElement("span");
  colorHeading.className = "product-card__color-heading";
  colorHeading.textContent = "Màu sắc";

  const colorOptions = document.createElement("div");
  colorOptions.className = "product-card__color-options";

  const selectedColorLabel = document.createElement("span");
  selectedColorLabel.className = "product-card__selected-color";
  selectedColorLabel.textContent = `Đã chọn: ${selectedColor}`;

  PRODUCT_COLORS.forEach(({ name, swatch }, index) => {
    const colorButton = document.createElement("button");
    colorButton.type = "button";
    colorButton.className =
      "product-card__color" + (index === 0 ? " is-selected" : "");
    colorButton.setAttribute("aria-label", name);
    colorButton.setAttribute("aria-pressed", String(index === 0));
    colorButton.title = name;

    const colorSwatch = document.createElement("span");
    colorSwatch.className = `product-card__color-swatch ${swatch}`;
    colorSwatch.setAttribute("aria-hidden", "true");
    colorButton.append(colorSwatch);
    colorButton.addEventListener("click", () => {
      selectedColor = name;
      colorOptions.querySelectorAll(".product-card__color").forEach((option) => {
        const isSelected = option === colorButton;
        option.classList.toggle("is-selected", isSelected);
        option.setAttribute("aria-pressed", String(isSelected));
      });
      selectedColorLabel.textContent = `Đã chọn: ${selectedColor}`;

      const detailUrl = new URL(detailLink.href, window.location.href);
      detailUrl.searchParams.set("color", selectedColor);
      detailLink.href = detailUrl.href;
    });
    colorOptions.append(colorButton);
  });
  colorPicker.append(colorHeading, colorOptions, selectedColorLabel);

  const buyButton = document.createElement("button");
  buyButton.type = "button";
  buyButton.className = "product-card__buy";
  buyButton.dataset.productId = productId;
  buyButton.textContent = "Mua ngay";
  buyButton.addEventListener("click", () => {
    const params = new URLSearchParams({
      productId,
      color: selectedColor,
    });
    window.location.href = `order.html?${params.toString()}`;
  });

  card.append(detailLink, colorPicker, buyButton);
  link.replaceWith(card);
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
