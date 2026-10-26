/* =========================================================
   TT Bottly – Order & Checkout Page Logic
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  // Utility helpers
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const PRODUCT_CATALOG = {
    "1": {
      name: "Bình Giữ Nhiệt Daily 500ml",
      img: "images/trang.jpg",
      variant: "single",
      capacity: "500ml",
    },
    "2": {
      name: "Combo 2 Bình Everyday Daily Duo",
      img: "images/combo2.png",
      variant: "combo",
      capacity: "500ml",
    },
    "3": {
      name: "Bộ 3 Bình Everyday Daily Family",
      img: "images/combo3.png",
      variant: "trio",
      capacity: "500ml",
    },
    "4": {
      name: "Bình Giữ Nhiệt Sport 700ml",
      img: "images/binh700ml.png",
      variant: "single",
      capacity: "700ml",
    },
    "5": {
      name: "Premium Gift Set",
      img: "images/khacten.png",
      variant: "single",
      capacity: "500ml",
    },
    "6": {
      name: "Bình Giữ Nhiệt TT Bottly Pastel Hồng (500ml)",
      img: "images/hong.jpg",
      variant: "single",
      capacity: "500ml",
    },
    "7": {
      name: "Bình Giữ Nhiệt TT Bottly Xanh Lá Pastel (500ml)",
      img: "images/xanhla.jpg",
      variant: "single",
      capacity: "500ml",
    },
    "8": {
      name: "Bình Giữ Nhiệt TT Bottly Xanh Dương Pastel (500ml)",
      img: "images/xanhduong.jpg",
      variant: "single",
      capacity: "500ml",
    },
  };

  const COLOR_IMAGES = {
    Kem: "images/trang.jpg",
    "Hồng pastel": "images/hong.jpg",
    "Xanh dương pastel": "images/xanhduong.jpg",
    "Xanh rêu pastel": "images/xanhla.jpg",
    "Đỏ burgundy": "images/bình đỏ.png",
    Nâu: "images/bình nâu.png",
    Đen: "images/bình đen.png",
  };

  const orderParams = new URLSearchParams(window.location.search);
  const selectedProductId = orderParams.get("productId");
  const hasSelectedProduct = Object.prototype.hasOwnProperty.call(
    PRODUCT_CATALOG,
    selectedProductId,
  );
  const initialProduct = hasSelectedProduct
    ? PRODUCT_CATALOG[selectedProductId]
    : PRODUCT_CATALOG["2"];
  const initialQuantity = Number.parseInt(orderParams.get("quantity"), 10);
  const initialCapacity = orderParams.get("capacity");
  const initialCapacity1 = orderParams.get("capacity1");
  const initialCapacity2 = orderParams.get("capacity2");
  const initialColor = orderParams.get("color");
  const initialEngraving = orderParams.get("engraving") === "true";
  const initialEngravingName = orderParams.get("engravingName") || "";

  // State
  const state = {
    variant: initialProduct.variant,
    productId: hasSelectedProduct ? selectedProductId : "2",
    capacity:
      initialCapacity === "500ml" || initialCapacity === "700ml"
        ? initialCapacity
        : initialProduct.capacity,
    capacities: [
      initialCapacity1 === "500ml" || initialCapacity1 === "700ml"
        ? initialCapacity1
        : "500ml",
      initialCapacity2 === "500ml" || initialCapacity2 === "700ml"
        ? initialCapacity2
        : "500ml",
    ],
    qty: Number.isFinite(initialQuantity)
      ? Math.min(99, Math.max(1, initialQuantity))
      : 1,
    color: initialColor,
    addons: {
      bag: false,
      straw: false,
      laser: initialEngraving,
      laserText: initialEngravingName,
    },
    paymentMethod: "cod",
  };

  // DOM Elements
  const variantRadios = $$('input[name="variant"]');
  const capBtns = $$(".cap-btn");
  const qtyInput = $("#qtyInput");
  const qtyBtns = $$(".qty__btn");
  const addonChecks = $$('input[name="addons"]');
  const laserInputWrap = $("#laserInputWrap");
  const laserTextInput = $("#laserTextInput");
  const laserCheckbox = $('input[name="addons"][value="laser"]');
  const paymentCards = $$(".payment-method-card");
  const bankInfoBox = $("#bankInfoBox");

  const addonsCostRow = $("#addonsCostRow");
  const totalCostEl = $("#totalCost");
  const summaryImg = $("#summaryImg");
  const summaryProdName = $("#summaryProdName");
  const summaryProdVariant = $("#summaryProdVariant");
  const summaryProdPrice = $("#summaryProdPrice");

  // Checkout Form & Success Card
  const checkoutForm = $("#checkoutForm");
  const orderSuccessCard = $("#orderSuccessCard");
  const btnCloseConfirm = $("#btnCloseConfirm");
  const btnPrintOrder = $("#btnPrintOrder");
  const btnSubmitOrder = $("#btnSubmitOrder");

  function getLoggedInUser() {
    try {
      return JSON.parse(localStorage.getItem("tt_bottly_current_user"));
    } catch {
      return null;
    }
  }

  function syncAuthState() {
    const user = getLoggedInUser();
    const notice = $("#authUserNotice");

    if (user) {
      if (notice) notice.hidden = false;
      if ($("#loggedInUserName"))
        $("#loggedInUserName").textContent = user.fullname;
      if ($("#loggedInUserEmail"))
        $("#loggedInUserEmail").textContent = user.email;
    } else {
      if (notice) notice.hidden = true;
    }
  }

  // Initialize
  function updateStateAndUI() {
    const prod = PRODUCT_CATALOG[state.productId];
    if (qtyInput) qtyInput.value = state.qty;
    const activeAddonsList = [];
    if (state.addons.bag) {
      activeAddonsList.push("Túi canvas quai da");
    }
    if (state.addons.straw) {
      activeAddonsList.push("Set ống hút inox 304");
    }
    if (state.addons.laser) {
      const note = state.addons.laserText ? ` (${state.addons.laserText})` : "";
      activeAddonsList.push(`Khắc laser tên riêng${note}`);
    }

    const firstSelectedColor = (state.color || "").split(",")[0].trim();
    summaryImg.src = COLOR_IMAGES[firstSelectedColor] || prod.img;
    summaryImg.alt = prod.name;
    summaryProdName.textContent = prod.name;
    summaryProdVariant.textContent =
      (state.productId === "2"
        ? `Dung tích bình 1: ${state.capacities[0]} | Bình 2: ${state.capacities[1]}`
        : `Dung tích: ${state.capacity}`) +
      (state.color ? ` | Màu: ${state.color}` : "") +
      ` | SL: ${state.qty}` +
      (activeAddonsList.length
        ? ` | Kèm: ${activeAddonsList.join(", ")}`
        : "");
    summaryProdPrice.textContent = "Liên hệ";

    $("#subtotalCost").textContent = "Liên hệ";
    $("#shippingCost").textContent = "Liên hệ";
    totalCostEl.textContent = "Liên hệ";
    addonsCostRow.style.display = activeAddonsList.length > 0 ? "flex" : "none";
    $("#addonsCost").textContent = "Liên hệ";

    const mobileStickyTotalEl = $("#mobileStickyTotal");
    if (mobileStickyTotalEl) mobileStickyTotalEl.textContent = "Liên hệ";

    // Update radio variant card active styles and contact labels
    $$(".variant-card").forEach((card) => {
      const vKey = card.dataset.variant;
      const isSelected = vKey === state.variant;
      card.classList.toggle("is-selected", isSelected);
      const radio = $('input[type="radio"]', card);
      if (radio) radio.checked = isSelected;

      const cardPriceEl = $(".variant-price", card);
      if (cardPriceEl) cardPriceEl.textContent = "Liên hệ";
    });
    capBtns.forEach((button) => {
      button.classList.toggle(
        "is-active",
        button.dataset.capacity === state.capacity,
      );
    });
    if (laserCheckbox) {
      laserCheckbox.checked = state.addons.laser;
      const parentItem = laserCheckbox.closest(".addon-item");
      if (parentItem) {
        parentItem.classList.toggle(
          "is-checked",
          state.addons.laser,
        );
      }
    }
    if (laserTextInput) laserTextInput.value = state.addons.laserText;
    if (laserInputWrap) laserInputWrap.classList.toggle("is-visible", state.addons.laser);

    // Update bank transfer QR if visible
    if (state.paymentMethod === "bank") {
      const qrDesc = $("#bankTransferDesc");
      if (qrDesc) {
        qrDesc.textContent =
          "Vui lòng liên hệ hotline 0363 409 513 để được báo giá và hướng dẫn thanh toán.";
      }
    }
  }

  // Variant change event
  variantRadios.forEach((radio) => {
    radio.addEventListener("change", () => {
      state.variant = radio.value;
      state.productId =
        radio.value === "single" ? "1" : radio.value === "trio" ? "3" : "2";
      state.color = "";
      updateStateAndUI();
    });
  });

  // Clicking anywhere on variant card
  $$(".variant-card").forEach((card) => {
    card.addEventListener("click", () => {
      const v = card.dataset.variant;
      if (v !== state.variant) {
        state.variant = v;
        state.productId = v === "single" ? "1" : v === "trio" ? "3" : "2";
        state.color = "";
      }
      const radio = $(`input[value="${v}"]`);
      if (radio) radio.checked = true;
      updateStateAndUI();
    });
  });

  // Capacity selection
  capBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      capBtns.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      state.capacity = btn.dataset.capacity;
      updateStateAndUI();
    });
  });

  // Quantity controls
  qtyBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = Number(btn.dataset.step);
      state.qty = Math.max(1, state.qty + step);
      qtyInput.value = state.qty;
      updateStateAndUI();
    });
  });

  if (qtyInput) {
    qtyInput.addEventListener("change", () => {
      const val = parseInt(qtyInput.value, 10);
      state.qty = val > 0 ? val : 1;
      qtyInput.value = state.qty;
      updateStateAndUI();
    });
  }

  // Addons checkboxes
  addonChecks.forEach((chk) => {
    chk.addEventListener("change", () => {
      const itemCard = chk.closest(".addon-item");
      itemCard.classList.toggle("is-checked", chk.checked);

      if (chk.value === "bag") state.addons.bag = chk.checked;
      if (chk.value === "straw") state.addons.straw = chk.checked;
      if (chk.value === "laser") {
        state.addons.laser = chk.checked;
        laserInputWrap.classList.toggle("is-visible", chk.checked);
        if (chk.checked) laserTextInput.focus();
      }
      updateStateAndUI();
    });
  });

  if (laserTextInput) {
    laserTextInput.addEventListener("input", (e) => {
      state.addons.laserText = e.target.value.trim();
      updateStateAndUI();
    });
  }

  // Payment methods
  paymentCards.forEach((card) => {
    card.addEventListener("click", () => {
      paymentCards.forEach((c) => c.classList.remove("is-selected"));
      card.classList.add("is-selected");
      const radio = $('input[type="radio"]', card);
      if (radio) {
        radio.checked = true;
        state.paymentMethod = radio.value;
      }
      bankInfoBox.classList.toggle(
        "is-visible",
        state.paymentMethod === "bank",
      );
      updateStateAndUI();
    });
  });

  // Vietnamese phone regex
  const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

  function setFieldError(fieldId, errorMsg) {
    const input = $(`#${fieldId}`);
    if (!input) return true;
    const container = input.closest(".field");
    const errEl = $(".error", container);
    if (errorMsg) {
      container.classList.add("has-error");
      if (errEl) errEl.textContent = errorMsg;
      input.setAttribute("aria-invalid", "true");
      return false;
    } else {
      container.classList.remove("has-error");
      if (errEl) errEl.textContent = "";
      input.setAttribute("aria-invalid", "false");
      return true;
    }
  }

  function validateCheckoutForm() {
    const name = $("#fullname").value.trim();
    const phone = $("#phone").value.replace(/[\s.-]/g, "");
    const province = $("#province").value;
    const address = $("#address").value.trim();

    const ok1 = setFieldError(
      "fullname",
      name ? "" : "Vui lòng nhập họ và tên.",
    );
    const ok2 = setFieldError(
      "phone",
      PHONE_RE.test(phone)
        ? ""
        : "Vui lòng nhập số điện thoại hợp lệ (10 chữ số).",
    );
    const ok3 = setFieldError(
      "province",
      province ? "" : "Vui lòng chọn Tỉnh / Thành phố.",
    );
    const ok4 = setFieldError(
      "address",
      address ? "" : "Vui lòng nhập địa chỉ giao hàng cụ thể.",
    );

    return ok1 && ok2 && ok3 && ok4;
  }

  // Clear errors on input
  ["fullname", "phone", "province", "address"].forEach((id) => {
    const el = $(`#${id}`);
    if (el) {
      el.addEventListener("input", () => setFieldError(id, ""));
      el.addEventListener("change", () => setFieldError(id, ""));
    }
  });

  // Form submission
  checkoutForm.addEventListener("submit", (e) => {
    e.preventDefault();

    // 1. Kiểm tra tài khoản: Nếu chưa đăng nhập thì tự động chuyển sang trang tài khoản kèm thông báo
    const currentUser = getLoggedInUser();
    if (!currentUser) {
      window.location.href =
        "auth.html?redirect=order.html&msg=login_required#login";
      return;
    }

    if (!validateCheckoutForm()) {
      const firstInvalid = $('[aria-invalid="true"]', checkoutForm);
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        firstInvalid.focus();
      }
      return;
    }

    // Generate random order code
    const orderId = "TTB-" + Math.floor(100000 + Math.random() * 900000);
    const prod = PRODUCT_CATALOG[state.productId];
    const totalText = "Liên hệ";

    // Fill in Confirmation Modal Details
    $("#modalOrderId").textContent = orderId;
    $("#modalCustomerName").textContent = $("#fullname").value.trim();
    $("#modalCustomerPhone").textContent = $("#phone").value.trim();
    $("#modalCustomerAddress").textContent =
      `${$("#address").value.trim()}, ${$("#province").options[$("#province").selectedIndex].text}`;
    $("#modalProductInfo").textContent =
      `${prod.name} (${state.productId === "2" ? `Bình 1: ${state.capacities[0]}, Bình 2: ${state.capacities[1]}` : state.capacity}${state.color ? `, ${state.color}` : ""}) x ${state.qty}`;

    let paymentName = "Thanh toán khi nhận hàng (COD)";
    if (state.paymentMethod === "bank")
      paymentName = "Chuyển khoản VietQR 24/7";
    if (state.paymentMethod === "momo") paymentName = "Ví điện tử MoMo";
    $("#modalPaymentMethod").textContent = paymentName;
    $("#modalGrandTotal").textContent = totalText;

    // Save order to localStorage for Profile history
    try {
      const orders = JSON.parse(localStorage.getItem("tt_bottly_orders")) || [];
      const newOrder = {
        id: orderId,
        date: new Date().toLocaleDateString("vi-VN"),
        product: `${prod.name} (${state.productId === "2" ? `Bình 1: ${state.capacities[0]}, Bình 2: ${state.capacities[1]}` : state.capacity}${state.color ? `, ${state.color}` : ""}) x ${state.qty}`,
        total: totalText,
        status: "Đã xác nhận",
        payment: state.paymentMethod.toUpperCase(),
      };
      orders.unshift(newOrder);
      localStorage.setItem(
        "tt_bottly_orders",
        JSON.stringify(orders.slice(0, 20)),
      );
    } catch (err) {
      console.warn("Cannot save order to localStorage", err);
    }

    // Display Success Notification directly under order summary
    if (orderSuccessCard) {
      orderSuccessCard.hidden = false;
      setTimeout(() => {
        orderSuccessCard.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }

    // Update submit button to success state
    if (btnSubmitOrder) {
      btnSubmitOrder.innerHTML = "✓ Đã đặt hàng thành công!";
      btnSubmitOrder.classList.add("btn--success-placed");
      btnSubmitOrder.disabled = true;
    }

    // Hide mobile sticky bar on successful order placement
    const mobileStickyBarEl = $("#mobileStickyBar");
    if (mobileStickyBarEl) {
      mobileStickyBarEl.classList.add("is-hidden");
    }
  });

  // Print invoice interaction
  if (btnPrintOrder) {
    btnPrintOrder.addEventListener("click", () => {
      window.print();
    });
  }

  // Copy Bank Account Number
  const copyBankAccBtn = $("#copyBankAccBtn");
  const copyAccBadge = $("#copyAccBadge");
  if (copyBankAccBtn && copyAccBadge) {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText("999988886868");
        copyAccBadge.textContent = "✓ Đã chép!";
        copyAccBadge.classList.add("is-copied");
        setTimeout(() => {
          copyAccBadge.textContent = "📋 Sao chép";
          copyAccBadge.classList.remove("is-copied");
        }, 2200);
      } catch (err) {
        copyAccBadge.textContent = "9999 8888 6868";
      }
    };
    copyBankAccBtn.addEventListener("click", handleCopy);
    copyBankAccBtn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleCopy();
      }
    });
  }

  // Mobile Sticky Checkout Bar handler & intersection observer
  const mobileStickyBar = $("#mobileStickyBar");
  const mobileStickyBtn = $("#mobileStickyBtn");

  if (mobileStickyBtn && checkoutForm) {
    mobileStickyBtn.addEventListener("click", () => {
      if (btnSubmitOrder && !btnSubmitOrder.disabled) {
        btnSubmitOrder.click();
      }
    });
  }

  // Hide sticky bar when user scrolls near the main submit button
  if (mobileStickyBar && btnSubmitOrder && "IntersectionObserver" in window) {
    const stickyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting || btnSubmitOrder.disabled) {
            mobileStickyBar.classList.add("is-hidden");
          } else {
            mobileStickyBar.classList.remove("is-hidden");
          }
        });
      },
      { threshold: 0.15 },
    );
    stickyObserver.observe(btnSubmitOrder);
  }

  // Sticky header and Mobile nav
  const burger = $("#burger");
  const nav = $("#nav");

  if (burger && nav) {
    burger.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // Sync auth state & Pre-fill user information if logged in
  syncAuthState();
  try {
    const currentUser = getLoggedInUser();
    if (currentUser) {
      if (currentUser.fullname && $("#fullname"))
        $("#fullname").value = currentUser.fullname;
      if (currentUser.phone && $("#phone"))
        $("#phone").value = currentUser.phone;
      if (currentUser.email && $("#email"))
        $("#email").value = currentUser.email;
      if (currentUser.address && $("#address"))
        $("#address").value = currentUser.address;
    }
  } catch (err) {
    // Ignore error
  }

  // Initial render
  updateStateAndUI();
});
