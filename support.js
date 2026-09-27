/* =========================================================
   TT Bottly – Support & Chatbot Logic
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // Knowledge base for automated FAQ replies
  const FAQ_KNOWLEDGE = [
    {
      keywords: ['nóng', 'lạnh', 'bao lâu', 'giữ nhiệt', 'thời gian', 'nhiệt độ'],
      answer: 'Cốc giữ nhiệt TT Bottly sử dụng công nghệ chân không 2 lớp cao cấp: có khả năng <strong>giữ ấm từ 8–10 tiếng</strong> (rất thích hợp cho cà phê, trà thảo mộc) và <strong>giữ lạnh lên đến 12–24 tiếng</strong> mà không hề đọng nước ra thành ngoài cốc.'
    },
    {
      keywords: ['chất liệu', 'inox', '304', 'an toàn', 'sức khỏe', 'thép'],
      answer: 'Toàn bộ ruột cốc và thân cốc TT Bottly được chế tác từ <strong>Inox 304 nguyên khối</strong> (thép không gỉ thực phẩm cao cấp), đạt chuẩn kiểm nghiệm an toàn cho sức khỏe, chống ăn mòn, không gỉ sét và không ám mùi đồ uống.'
    },
    {
      keywords: ['rò rỉ', 'chống tràn', 'balo', 'túi', 'nghiêng', 'tràn'],
      answer: 'Nắp cốc TT Bottly được thiết kế ren vặn xoáy kín khít kết hợp <strong>gioăng silicone 360 độ</strong>, cam kết <strong>chống rò rỉ nước 100%</strong> khi bạn bỏ vào balo, túi xách hoặc đặt trên hộc để ly ô tô khi di chuyển.'
    },
    {
      keywords: ['dung tích', 'size', 'kích thước', 'màu', 'màu sắc', 'đen', 'xanh', 'xám', 'trắng'],
      answer: 'TT Bottly hiện có 2 phiên bản dung tích: <strong>500ml</strong> (gọn nhẹ, vừa mọi hộc ô tô) và <strong>750ml</strong> (dung tích lớn). Với 4 gam màu sơn tĩnh điện nhám cao cấp: <strong>Xanh Rêu Forest</strong>, <strong>Xám Slate</strong>, <strong>Đen Nhám Matte</strong> và <strong>Trắng Ngà Classic</strong>.'
    },
    {
      keywords: ['bảo hành', 'đổi trả', 'lỗi', 'hỏng', 'chính sách'],
      answer: 'TT Bottly cam kết chính sách bảo hành chính hãng: <strong>Bảo hành 12 tháng</strong> đối với khả năng giữ nhiệt và <strong>1 đổi 1 trong vòng 7 ngày</strong> nếu phát hiện bất kỳ lỗi nào từ nhà sản xuất.'
    },
    {
      keywords: ['ship', 'vận chuyển', 'giao hàng', 'phí ship', 'freeship', 'thời gian'],
      answer: 'Thời gian giao hàng từ <strong>1–3 ngày làm việc</strong> trên toàn quốc. Đơn hàng từ 500.000₫ hoặc Combo 2 cốc trở lên được <strong>Miễn phí vận chuyển (Freeship)</strong>. Khách hàng được quyền đồng kiểm (kiểm tra hàng trước khi thanh toán).'
    },
    {
      keywords: ['vệ sinh', 'rửa', 'cọ', 'mùi', 'dùng lần đầu'],
      answer: 'Khi mới mua về, bạn chỉ cần tráng cốc bằng nước ấm pha chút chanh hoặc baking soda trong 15 phút. Miệng cốc rộng rãi giúp bạn dễ dàng luồn tay vệ sinh sạch sẽ mỗi ngày mà không bị đọng cặn.'
    },
    {
      keywords: ['giá', 'bao nhiêu', 'tiền', 'combo', 'mua', 'đặt hàng'],
      answer: 'Giá ưu đãi hiện tại: 1 cốc giá từ <strong>349.000₫</strong>, Combo 2 cốc tiết kiệm 35% chỉ còn <strong>649.000₫</strong> (tặng kèm bộ cọ + freeship). Anh/chị có thể nhấn vào mục <a href="order.html" style="color: var(--cta); font-weight: 700; text-decoration: underline;">Đặt hàng ngay</a> để chọn màu và nhận ưu đãi ạ!'
    }
  ];

  // Chat elements
  const chatMessages = $('#chatMessages');
  const chatInput = $('#chatInput');
  const chatSendBtn = $('#chatSendBtn');
  const chatQuickChips = $$('.chat-chip');
  const chatRefreshBtn = $('#chatRefreshBtn');

  // Contact form elements
  const supportForm = $('#supportForm');
  const ticketAlert = $('#ticketAlert');
  const ticketIdEl = $('#ticketId');

  function getCurrentTime() {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  function appendMessage(text, isUser = false) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isUser ? 'chat-bubble--user' : 'chat-bubble--bot'}`;
    bubble.innerHTML = `${text}<span class="chat-time">${getCurrentTime()}</span>`;
    chatMessages.appendChild(bubble);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return bubble;
  }

  function showTypingIndicator() {
    const typing = document.createElement('div');
    typing.className = 'typing-dots';
    typing.id = 'typingIndicator';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatMessages.appendChild(typing);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function removeTypingIndicator() {
    const typing = $('#typingIndicator', chatMessages);
    if (typing) typing.remove();
  }

  function renderInlineContactForm() {
    const formBox = document.createElement('div');
    formBox.className = 'chat-lead-box';
    formBox.innerHTML = `
      <h5>📋 Để lại thông tin để CSKH hỗ trợ ngay:</h5>
      <input type="text" id="chatLeadName" placeholder="Họ và tên của bạn...">
      <input type="tel" id="chatLeadPhone" placeholder="Số điện thoại liên hệ *">
      <input type="email" id="chatLeadEmail" placeholder="Email nhận phản hồi...">
      <textarea id="chatLeadNote" rows="2" placeholder="Ghi chú nội dung bạn cần hỗ trợ..."></textarea>
      <button type="button" class="btn btn--cta btn--sm" id="btnSubmitChatLead">Gửi yêu cầu hỗ trợ</button>
    `;

    chatMessages.appendChild(formBox);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const btnSubmit = $('#btnSubmitChatLead', formBox);
    btnSubmit.addEventListener('click', () => {
      const phoneInput = $('#chatLeadPhone', formBox);
      const phone = phoneInput.value.trim();
      const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;

      if (!PHONE_RE.test(phone.replace(/[\s.-]/g, ''))) {
        alert('Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
        phoneInput.focus();
        return;
      }

      const randomTicket = 'CSKH-' + Math.floor(100000 + Math.random() * 900000);
      formBox.innerHTML = `
        <div style="color: #065f46; font-size: 13.5px; line-height: 1.5;">
          <strong>✓ Tiếp nhận thành công!</strong><br>
          Mã hỗ trợ của bạn: <span style="font-weight: 700; color: #0f766e;">#${randomTicket}</span>.<br>
          Chuyên viên CSKH TT Bottly sẽ gọi lại theo số <strong>${phone}</strong> trong vòng 15-30 phút tới. Cảm ơn bạn!
        </div>
      `;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  }

  function handleUserMessage(query) {
    const text = query.trim();
    if (!text) return;

    // Display user message
    appendMessage(text, true);
    if (chatInput) chatInput.value = '';

    // Show bot typing
    showTypingIndicator();

    setTimeout(() => {
      removeTypingIndicator();

      const lower = text.toLowerCase();

      // Check if user asks for personal support / other issues
      if (lower.includes('gặp vấn đề') || lower.includes('nhân viên') || lower.includes('tư vấn trực tiếp') || lower.includes('khác') || lower.includes('hỗ trợ khác')) {
        appendMessage('Dạ vấn đề này cần chuyên viên CSKH giải quyết riêng. Anh/chị vui lòng để lại số điện thoại và email ở biểu mẫu dưới đây, em sẽ chuyển thông tin ngay cho đội ngũ kỹ thuật ạ! 👇');
        renderInlineContactForm();
        return;
      }

      // Check knowledge base
      let matchedFAQ = null;
      for (const faq of FAQ_KNOWLEDGE) {
        if (faq.keywords.some(kw => lower.includes(kw))) {
          matchedFAQ = faq;
          break;
        }
      }

      if (matchedFAQ) {
        appendMessage(matchedFAQ.answer);
      } else {
        appendMessage('Dạ câu hỏi của anh/chị nằm ngoài danh mục tự động. Anh/chị vui lòng để lại thông tin số điện thoại hoặc email kèm ghi chú, chuyên viên hỗ trợ của TT Bottly sẽ liên hệ giải đáp chi tiết ngay ạ!');
        renderInlineContactForm();
      }
    }, 600);
  }

  // Send button & enter key
  if (chatSendBtn && chatInput) {
    chatSendBtn.addEventListener('click', () => handleUserMessage(chatInput.value));
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleUserMessage(chatInput.value);
      }
    });
  }

  // Quick Chips
  chatQuickChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const q = chip.textContent.trim();
      handleUserMessage(q);
    });
  });

  // Refresh Chat
  if (chatRefreshBtn) {
    chatRefreshBtn.addEventListener('click', () => {
      chatMessages.innerHTML = '';
      appendMessage('Xin chào! Em là Trợ lý ảo TT Bottly 🌿. Em có thể giải đáp nhanh các thắc mắc về chất liệu, dung tích, khả năng giữ nhiệt, phí ship và bảo hành. Anh/chị đang quan tâm đến vấn đề gì ạ?');
    });
  }

  // Handle Support Form on Right Column
  if (supportForm) {
    supportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#supportName').value.trim();
      const phone = $('#supportPhone').value.replace(/[\s.-]/g, '');
      const email = $('#supportEmail').value.trim();
      const note = $('#supportNote').value.trim();

      const PHONE_RE = /^(0|\+84)(3|5|7|8|9)\d{8}$/;
      const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name) {
        alert('Vui lòng nhập họ và tên.');
        $('#supportName').focus();
        return;
      }
      if (!PHONE_RE.test(phone)) {
        alert('Vui lòng nhập số điện thoại hợp lệ (10 chữ số).');
        $('#supportPhone').focus();
        return;
      }
      if (!EMAIL_RE.test(email)) {
        alert('Vui lòng nhập email hợp lệ để nhận thông báo giải quyết.');
        $('#supportEmail').focus();
        return;
      }
      if (!note) {
        alert('Vui lòng nhập nội dung ghi chú vấn đề bạn cần hỗ trợ.');
        $('#supportNote').focus();
        return;
      }

      // Generate Ticket
      const ticketId = 'CSKH-' + Math.floor(100000 + Math.random() * 900000);
      if (ticketIdEl) ticketIdEl.textContent = '#' + ticketId;
      if (ticketAlert) ticketAlert.classList.add('is-visible');

      // Also notify in chat window
      appendMessage(`Đã tiếp nhận yêu cầu hỗ trợ <strong>#${ticketId}</strong> của khách hàng <strong>${name}</strong> (SĐT: ${phone}, Email: ${email}). Bộ phận hỗ trợ khách hàng sẽ phản hồi trong vòng 15-30 phút.`);

      supportForm.reset();
    });
  }

  // Accordion in Support Aside
  $$('.faq-mini-q').forEach(q => {
    q.addEventListener('click', () => {
      const open = q.getAttribute('aria-expanded') === 'true';
      const answer = q.nextElementSibling;
      if (!answer) return;
      q.setAttribute('aria-expanded', String(!open));
      answer.style.maxHeight = open ? '0' : answer.scrollHeight + 'px';
    });
  });

  // Mobile menu
  const burger = $('#burger');
  const nav = $('#nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const isOpen = nav.classList.toggle('is-open');
      burger.classList.toggle('is-open', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
    });
  }
});
