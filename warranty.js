/**
 * TT Bottly – Warranty & Return Policy Interactive Scripts
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. FAQ Accordion Toggle
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const btn = item.querySelector('.faq-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const isOpen = item.classList.contains('is-open');
        faqItems.forEach(i => i.classList.remove('is-open'));
        if (!isOpen) {
          item.classList.add('is-open');
        }
      });
    }
  });

  // Open first FAQ by default
  if (faqItems[0]) {
    faqItems[0].classList.add('is-open');
  }

  // 2. Tra cứu bảo hành thông minh (Lookup Simulation)
  const lookupBtn = document.getElementById('lookupBtn');
  const lookupInput = document.getElementById('lookupPhone');
  const lookupResult = document.getElementById('lookupResult');

  if (lookupBtn && lookupInput && lookupResult) {
    lookupBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const val = lookupInput.value.trim();
      if (!val) {
        alert('Vui lòng nhập số điện thoại hoặc mã đơn hàng để tra cứu.');
        lookupInput.focus();
        return;
      }

      // Check localStorage for actual order or generate mock warranty card
      let customerName = 'Khách hàng TT Bottly';
      let orderCode = 'TTB-' + Math.floor(100000 + Math.random() * 900000);
      let purchaseDate = '15/01/2026';
      let productName = 'Cốc giữ nhiệt TT Bottly 500ml Inox 304';

      try {
        const localOrders = JSON.parse(localStorage.getItem('tt_bottly_orders') || '[]');
        const found = localOrders.find(o => o.phone === val || o.id === val);
        if (found) {
          customerName = found.name || customerName;
          orderCode = found.id || orderCode;
          productName = found.product || productName;
          purchaseDate = found.date || purchaseDate;
        }
      } catch (err) {}

      document.getElementById('resCustomerName').textContent = customerName;
      document.getElementById('resOrderCode').textContent = orderCode;
      document.getElementById('resProductName').textContent = productName;
      document.getElementById('resPurchaseDate').textContent = purchaseDate;
      document.getElementById('resWarrantyExpire').textContent = '15/01/2027 (Còn 315 ngày)';

      lookupResult.classList.add('is-active');
      lookupResult.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

});
