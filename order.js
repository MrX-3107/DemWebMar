/* =========================================================
   TT Bottly – Order & Checkout Page Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Utility helpers
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  const formatVND = (num) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num).replace('₫', '₫');

  // Product configurations
  const PRODUCTS = {
    'single': {
      name: 'Cốc giữ nhiệt TT Bottly (1 Cốc)',
      badge: 'Phổ biến',
      badgeClass: '',
      prices: {
        '500ml': 349000,
        '750ml': 399000
      },
      originalPrices: {
        '500ml': 499000,
        '750ml': 550000
      }
    },
    'combo': {
      name: 'Combo 2 Cốc TT Bottly (Tiết kiệm)',
      badge: 'Bán chạy nhất 🔥',
      badgeClass: 'variant-badge--hot',
      prices: {
        '500ml': 649000,
        '750ml': 729000
      },
      originalPrices: {
        '500ml': 998000,
        '750ml': 1100000
      }
    },
    'trio': {
      name: 'Combo 3 Cốc TT Bottly Gia Đình',
      badge: 'Giảm 35%',
      badgeClass: '',
      prices: {
        '500ml': 929000,
        '750ml': 1049000
      },
      originalPrices: {
        '500ml': 1497000,
        '750ml': 1650000
      }
    }
  };

  const COLOR_DATA = {
    'green': { name: 'Xanh Rêu Forest', img: 'images/product-main.jpg' },
    'gray': { name: 'Xám Slate Metal', img: 'images/product-2.jpg' },
    'black': { name: 'Đen Nhám Matte', img: 'images/product-3.jpg' },
    'white': { name: 'Trắng Ngà Classic', img: 'images/product-colors.jpg' }
  };

  const COUPONS = {
    'FREESHIP': { type: 'shipping', value: 0, text: 'Miễn phí vận chuyển toàn quốc' },
    'GIAM20K': { type: 'fixed', value: 20000, text: 'Giảm trực tiếp 20.000₫' },
    'TTBOTTLY10': { type: 'percent', value: 0.1, text: 'Giảm 10% giá trị sản phẩm' }
  };

  // State
  const state = {
    variant: 'combo',
    capacity: '500ml',
    color: 'green',
    qty: 1,
    addons: {
      bag: false,
      straw: false,
      laser: false,
      laserText: ''
    },
    appliedCoupon: null,
    paymentMethod: 'cod'
  };

  // DOM Elements
  const variantRadios = $$('input[name="variant"]');
  const colorBtns = $$('.color-btn');
  const capBtns = $$('.cap-btn');
  const qtyInput = $('#qtyInput');
  const qtyBtns = $$('.qty__btn');
  const addonChecks = $$('input[name="addons"]');
  const laserInputWrap = $('#laserInputWrap');
  const laserTextInput = $('#laserTextInput');
  const paymentCards = $$('.payment-method-card');
  const bankInfoBox = $('#bankInfoBox');

  // Summary Elements
  const summaryImg = $('#summaryImg');
  const summaryProdName = $('#summaryProdName');
  const summaryProdVariant = $('#summaryProdVariant');
  const summaryProdPrice = $('#summaryProdPrice');
  const subtotalCostEl = $('#subtotalCost');
  const addonsCostRow = $('#addonsCostRow');
  const addonsCostEl = $('#addonsCost');
  const shippingCostEl = $('#shippingCost');
  const discountRow = $('#discountRow');
  const discountAmountEl = $('#discountAmount');
  const totalCostEl = $('#totalCost');
  const chosenColorText = $('#chosenColorText');

  // Coupon Elements
  const couponInput = $('#couponInput');
  const btnApplyCoupon = $('#btnApplyCoupon');
  const couponMsg = $('#couponMsg');
  const couponTags = $$('.coupon-tag-btn');

  // Checkout Form & Success Card
  const checkoutForm = $('#checkoutForm');
  const orderSuccessCard = $('#orderSuccessCard');
  const btnCloseConfirm = $('#btnCloseConfirm');
  const btnPrintOrder = $('#btnPrintOrder');
  const btnSubmitOrder = $('#btnSubmitOrder');

  function getLoggedInUser() {
    try {
      return JSON.parse(localStorage.getItem('tt_bottly_current_user'));
    } catch {
      return null;
    }
  }

  function syncAuthState() {
    const user = getLoggedInUser();
    const notice = $('#authUserNotice');

    if (user) {
      if (notice) notice.hidden = false;
      if ($('#loggedInUserName')) $('#loggedInUserName').textContent = user.fullname;
      if ($('#loggedInUserEmail')) $('#loggedInUserEmail').textContent = user.email;
    } else {
      if (notice) notice.hidden = true;
    }
  }

  // Initialize
  function updateStateAndUI() {
    const prod = PRODUCTS[state.variant];
    const unitPrice = prod.prices[state.capacity];
    const unitOriginalPrice = prod.originalPrices[state.capacity];
    const prodTotal = unitPrice * state.qty;

    // Calculate Add-ons
    let addonsTotal = 0;
    const activeAddonsList = [];
    if (state.addons.bag) {
      addonsTotal += 49000;
      activeAddonsList.push('Túi canvas quai da (+49.000₫)');
    }
    if (state.addons.straw) {
      addonsTotal += 29000;
      activeAddonsList.push('Set ống hút inox 304 (+29.000₫)');
    }
    if (state.addons.laser) {
      addonsTotal += 39000;
      const note = state.addons.laserText ? ` (${state.addons.laserText})` : '';
      activeAddonsList.push(`Khắc laser tên riêng${note} (+39.000₫)`);
    }

    // Calculate Shipping (Free if prodTotal >= 500.000₫ or FREESHIP coupon)
    let shipping = 30000;
    if (prodTotal >= 500000 || (state.appliedCoupon && state.appliedCoupon.type === 'shipping')) {
      shipping = 0;
    }

    // Calculate Discount
    let discount = 0;
    if (state.appliedCoupon) {
      if (state.appliedCoupon.type === 'fixed') {
        discount = state.appliedCoupon.value;
      } else if (state.appliedCoupon.type === 'percent') {
        discount = Math.round(prodTotal * state.appliedCoupon.value);
      }
    }

    // Grand Total
    const grandTotal = Math.max(0, prodTotal + addonsTotal + shipping - discount);

    // Update Summary Sidebar
    const colorInfo = COLOR_DATA[state.color];
    summaryImg.src = colorInfo.img;
    summaryImg.alt = `${prod.name} – ${colorInfo.name}`;
    summaryProdName.textContent = prod.name;
    
    let variantDesc = `Dung tích: ${state.capacity} | Màu sắc: ${colorInfo.name} | SL: ${state.qty}`;
    if (activeAddonsList.length > 0) {
      variantDesc += `<br><span style="color: #0f766e; font-size: 12px; margin-top: 4px; display: inline-block;">+ Kèm: ${activeAddonsList.join(', ')}</span>`;
    }
    summaryProdVariant.innerHTML = variantDesc;
    summaryProdPrice.textContent = formatVND(prodTotal);

    subtotalCostEl.textContent = formatVND(prodTotal);

    if (addonsTotal > 0) {
      addonsCostRow.style.display = 'flex';
      addonsCostEl.textContent = `+${formatVND(addonsTotal)}`;
    } else {
      addonsCostRow.style.display = 'none';
    }

    if (shipping === 0) {
      shippingCostEl.innerHTML = '<span style="color: #0f766e; font-weight: 700;">MIỄN PHÍ</span>';
    } else {
      shippingCostEl.textContent = formatVND(shipping);
    }

    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountAmountEl.textContent = `-${formatVND(discount)}`;
    } else {
      discountRow.style.display = 'none';
    }

    totalCostEl.textContent = formatVND(grandTotal);

    const mobileStickyTotalEl = $('#mobileStickyTotal');
    if (mobileStickyTotalEl) mobileStickyTotalEl.textContent = formatVND(grandTotal);

    // Update Color label
    chosenColorText.textContent = colorInfo.name;

    // Update radio variant card active styles and price tags
    $$('.variant-card').forEach(card => {
      const vKey = card.dataset.variant;
      const isSelected = vKey === state.variant;
      card.classList.toggle('is-selected', isSelected);
      const radio = $('input[type="radio"]', card);
      if (radio) radio.checked = isSelected;

      // Update card price according to chosen capacity
      const cardPriceEl = $('.variant-price', card);
      const cardOldPriceEl = $('.variant-old-price', card);
      if (cardPriceEl && PRODUCTS[vKey]) {
        cardPriceEl.textContent = formatVND(PRODUCTS[vKey].prices[state.capacity]);
      }
      if (cardOldPriceEl && PRODUCTS[vKey]) {
        cardOldPriceEl.textContent = formatVND(PRODUCTS[vKey].originalPrices[state.capacity]);
      }
    });

    // Update bank transfer QR if visible
    if (state.paymentMethod === 'bank') {
      const qrDesc = $('#bankTransferDesc');
      if (qrDesc) {
        qrDesc.innerHTML = `Nội dung CK: <strong>TTB ${$('#phone') ? $('#phone').value.trim() || 'SĐT' : 'DONHANG'}</strong><br>Số tiền chính xác: <strong>${formatVND(grandTotal)}</strong>`;
      }
    }
  }

  // Variant change event
  variantRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      state.variant = radio.value;
      updateStateAndUI();
    });
  });

  // Clicking anywhere on variant card
  $$('.variant-card').forEach(card => {
    card.addEventListener('click', () => {
      const v = card.dataset.variant;
      state.variant = v;
      const radio = $(`input[value="${v}"]`);
      if (radio) radio.checked = true;
      updateStateAndUI();
    });
  });

  // Capacity selection
  capBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      capBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.capacity = btn.dataset.capacity;
      updateStateAndUI();
    });
  });

  // Color selection
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      state.color = btn.dataset.color;
      updateStateAndUI();
    });
  });

  // Quantity controls
  qtyBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const step = Number(btn.dataset.step);
      state.qty = Math.max(1, state.qty + step);
      qtyInput.value = state.qty;
      updateStateAndUI();
    });
  });

  qtyInput.addEventListener('change', () => {
    const val = parseInt(qtyInput.value, 10);
    state.qty = val > 0 ? val : 1;
    qtyInput.value = state.qty;
    updateStateAndUI();
  });

  // Addons checkboxes
  addonChecks.forEach(chk => {
    chk.addEventListener('change', () => {
      const itemCard = chk.closest('.addon-item');
      itemCard.classList.toggle('is-checked', chk.checked);

      if (chk.value === 'bag') state.addons.bag = chk.checked;
      if (chk.value === 'straw') state.addons.straw = chk.checked;
      if (chk.value === 'laser') {
        state.addons.laser = chk.checked;
        laserInputWrap.classList.toggle('is-visible', chk.checked);
        if (chk.checked) laserTextInput.focus();
      }
      updateStateAndUI();
    });
  });

  laserTextInput.addEventListener('input', (e) => {
    state.addons.laserText = e.target.value.trim();
    updateStateAndUI();
  });

  // Payment methods
  paymentCards.forEach(card => {
    card.addEventListener('click', () => {
      paymentCards.forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      const radio = $('input[type="radio"]', card);
      if (radio) {
        radio.checked = true;
        state.paymentMethod = radio.value;
      }
      bankInfoBox.classList.toggle('is-visible', state.paymentMethod === 'bank');
      updateStateAndUI();
    });
  });

  // Coupon handling
  function applyCoupon(code) {
    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      showCouponMessage('Vui lòng nhập mã giảm giá', false);
      return;
    }
    const coupon = COUPONS[cleanCode];
    if (coupon) {
      state.appliedCoupon = coupon;
      showCouponMessage(`Áp dụng thành công: ${coupon.text}`, true);
      updateStateAndUI();
    } else {
      showCouponMessage('Mã giảm giá không tồn tại hoặc đã hết hạn', false);
    }
  }

  function showCouponMessage(msg, isSuccess) {
    couponMsg.textContent = msg;
    couponMsg.className = `coupon-msg ${isSuccess ? 'is-success' : 'is-error'}`;
    couponMsg.style.display = 'block';
  }

  btnApplyCoupon.addEventListener('click', () => {
    applyCoupon(couponInput.value);
  });

  couponInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyCoupon(couponInput.value);
    }
  });

  couponTags.forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.code;
      couponInput.value = code;
      applyCoupon(code);
    });
  });

  // Vietnamese phone regex
  const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

  function setFieldError(fieldId, errorMsg) {
    const input = $(`#${fieldId}`);
    if (!input) return true;
    const container = input.closest('.field');
    const errEl = $('.error', container);
    if (errorMsg) {
      container.classList.add('has-error');
      if (errEl) errEl.textContent = errorMsg;
      input.setAttribute('aria-invalid', 'true');
      return false;
    } else {
      container.classList.remove('has-error');
      if (errEl) errEl.textContent = '';
      input.setAttribute('aria-invalid', 'false');
      return true;
    }
  }

  function validateCheckoutForm() {
    const name = $('#fullname').value.trim();
    const phone = $('#phone').value.replace(/[\s.-]/g, '');
    const province = $('#province').value;
    const address = $('#address').value.trim();

    const ok1 = setFieldError('fullname', name ? '' : 'Vui lòng nhập họ và tên.');
    const ok2 = setFieldError('phone', PHONE_RE.test(phone) ? '' : 'Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
    const ok3 = setFieldError('province', province ? '' : 'Vui lòng chọn Tỉnh / Thành phố.');
    const ok4 = setFieldError('address', address ? '' : 'Vui lòng nhập địa chỉ giao hàng cụ thể.');

    return ok1 && ok2 && ok3 && ok4;
  }

  // Clear errors on input
  ['fullname', 'phone', 'province', 'address'].forEach(id => {
    const el = $(`#${id}`);
    if (el) {
      el.addEventListener('input', () => setFieldError(id, ''));
      el.addEventListener('change', () => setFieldError(id, ''));
    }
  });

  // Form submission
  checkoutForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // 1. Kiểm tra tài khoản: Nếu chưa đăng nhập thì tự động chuyển sang trang tài khoản kèm thông báo
    const currentUser = getLoggedInUser();
    if (!currentUser) {
      window.location.href = 'auth.html?redirect=order.html&msg=login_required#login';
      return;
    }

    if (!validateCheckoutForm()) {
      const firstInvalid = $('[aria-invalid="true"]', checkoutForm);
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus();
      }
      return;
    }

    // Generate random order code
    const orderId = 'TTB-' + Math.floor(100000 + Math.random() * 900000);
    const prod = PRODUCTS[state.variant];
    const colorInfo = COLOR_DATA[state.color];
    const totalText = totalCostEl.textContent;

    // Fill in Confirmation Modal Details
    $('#modalOrderId').textContent = orderId;
    $('#modalCustomerName').textContent = $('#fullname').value.trim();
    $('#modalCustomerPhone').textContent = $('#phone').value.trim();
    $('#modalCustomerAddress').textContent = `${$('#address').value.trim()}, ${$('#province').options[$('#province').selectedIndex].text}`;
    $('#modalProductInfo').textContent = `${prod.name} (${colorInfo.name} - ${state.capacity}) x ${state.qty}`;
    
    let paymentName = 'Thanh toán khi nhận hàng (COD)';
    if (state.paymentMethod === 'bank') paymentName = 'Chuyển khoản VietQR 24/7';
    if (state.paymentMethod === 'momo') paymentName = 'Ví điện tử MoMo';
    $('#modalPaymentMethod').textContent = paymentName;
    $('#modalGrandTotal').textContent = totalText;

    // Save order to localStorage for Profile history
    try {
      const orders = JSON.parse(localStorage.getItem('tt_bottly_orders')) || [];
      const newOrder = {
        id: orderId,
        date: new Date().toLocaleDateString('vi-VN'),
        product: `${prod.name} (${colorInfo.name} - ${state.capacity}) x ${state.qty}`,
        total: totalText,
        status: 'Đã xác nhận',
        payment: state.paymentMethod.toUpperCase()
      };
      orders.unshift(newOrder);
      localStorage.setItem('tt_bottly_orders', JSON.stringify(orders.slice(0, 20)));
    } catch (err) {
      console.warn('Cannot save order to localStorage', err);
    }

    // Display Success Notification directly under order summary
    if (orderSuccessCard) {
      orderSuccessCard.hidden = false;
      setTimeout(() => {
        orderSuccessCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 100);
    }

    // Update submit button to success state
    if (btnSubmitOrder) {
      btnSubmitOrder.innerHTML = '✓ Đã đặt hàng thành công!';
      btnSubmitOrder.classList.add('btn--success-placed');
      btnSubmitOrder.disabled = true;
    }

    // Hide mobile sticky bar on successful order placement
    const mobileStickyBarEl = $('#mobileStickyBar');
    if (mobileStickyBarEl) {
      mobileStickyBarEl.classList.add('is-hidden');
    }
  });

  // Print invoice interaction
  if (btnPrintOrder) {
    btnPrintOrder.addEventListener('click', () => {
      window.print();
    });
  }

  // Copy Bank Account Number
  const copyBankAccBtn = $('#copyBankAccBtn');
  const copyAccBadge = $('#copyAccBadge');
  if (copyBankAccBtn && copyAccBadge) {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText('999988886868');
        copyAccBadge.textContent = '✓ Đã chép!';
        copyAccBadge.classList.add('is-copied');
        setTimeout(() => {
          copyAccBadge.textContent = '📋 Sao chép';
          copyAccBadge.classList.remove('is-copied');
        }, 2200);
      } catch (err) {
        copyAccBadge.textContent = '9999 8888 6868';
      }
    };
    copyBankAccBtn.addEventListener('click', handleCopy);
    copyBankAccBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCopy();
      }
    });
  }

  // Mobile Sticky Checkout Bar handler & intersection observer
  const mobileStickyBar = $('#mobileStickyBar');
  const mobileStickyBtn = $('#mobileStickyBtn');

  if (mobileStickyBtn && checkoutForm) {
    mobileStickyBtn.addEventListener('click', () => {
      if (btnSubmitOrder && !btnSubmitOrder.disabled) {
        btnSubmitOrder.click();
      }
    });
  }

  // Hide sticky bar when user scrolls near the main submit button
  if (mobileStickyBar && btnSubmitOrder && 'IntersectionObserver' in window) {
    const stickyObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting || btnSubmitOrder.disabled) {
          mobileStickyBar.classList.add('is-hidden');
        } else {
          mobileStickyBar.classList.remove('is-hidden');
        }
      });
    }, { threshold: 0.15 });
    stickyObserver.observe(btnSubmitOrder);
  }

  // Sticky header and Mobile nav
  const header = $('#header');
  const burger = $('#burger');
  const nav = $('#nav');

  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
    });
  }



  // Sync auth state & Pre-fill user information if logged in
  syncAuthState();
  try {
    const currentUser = getLoggedInUser();
    if (currentUser) {
      if (currentUser.fullname && $('#fullname')) $('#fullname').value = currentUser.fullname;
      if (currentUser.phone && $('#phone')) $('#phone').value = currentUser.phone;
      if (currentUser.email && $('#email')) $('#email').value = currentUser.email;
      if (currentUser.address && $('#address')) $('#address').value = currentUser.address;
    }
  } catch (err) {
    // Ignore error
  }

  // Initial render
  updateStateAndUI();
});
