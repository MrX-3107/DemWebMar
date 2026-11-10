/* =========================================================
   Aquabottle Việt Nam – Mặt nước sóng sánh (Water Surface)
   - Mô phỏng sóng nước thật trên <canvas> (thuật toán heightmap)
   - Rê chuột qua khoảng trắng: mặt nước gợn sóng theo đường đi
   - Click khoảng trắng: giọt nước xanh rơi xuống → bắn tia →
     sóng loang rộng, phản xạ ánh sáng, sóng sánh rồi lặng dần
   Chỉ kích hoạt ở khoảng trắng (không đè lên chữ, ảnh, nút...).
   ========================================================= */
(function () {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion) return;

  /* ---------- Cấu hình ---------- */
  const CELL = 4; // 1 ô mô phỏng = 4px màn hình
  const DAMPING = 0.981; // độ tắt dần của sóng (gần 1 = sóng lan xa, mượt)
  const DROP_FALL = 380; // thời gian giọt nước rơi (ms)
  const CLICK_RADIUS = 5; // bán kính vùng nước bị giọt đập vào (ô)
  const CLICK_POWER = 400; // lực giọt nước
  const HOVER_RADIUS = 2;
  const HOVER_POWER = 110;
  const MAX_ALPHA = 0.32; // Màu sóng nước nhạt và trong trẻo, dịu mắt hơn

  // Bảng màu nước trong trẻo, thanh thoát, màu nhạt dịu nhẹ hòa quyện với nền
  const HIGHLIGHT = [95, 165, 184]; // #5fa5b8 xanh ngọc dịu sáng
  const MIDTONE = [60, 128, 146]; // #3c8092 xanh nước biển thanh thoát
  const SHADOW = [32, 80, 96]; // #205060 bóng nước mềm mại

  // Các phần tử có nội dung – KHÔNG tạo hiệu ứng khi chuột nằm trên chúng
  const CONTENT_SELECTOR = [
    "a", "button", "input", "textarea", "select", "label",
    "img", "svg", "video", "table",
    "h1", "h2", "h3", "h4", "p", "li", "dt", "dd", "span", "strong",
    "article", ".specs", ".gallery", ".banner-container",
    ".pain-conclusion", ".section-header", ".checks",
    ".product-card", ".product-nav-menu",
    ".about-stat-card", ".about-story-media", ".about-highlight-box", ".pillar-card", ".b2b-card",
    ".chatbot-card", ".support-aside-card", ".channel-pill",
    ".auth-card", ".profile-sidebar-card", ".profile-main-card", ".modal-box",
    "header", "footer", ".float-cta", ".to-top", ".water-fx-toggle",
  ].join(",");

  const STORAGE_KEY = "aquabottle_water_fx";
  let fxEnabled = localStorage.getItem(STORAGE_KEY) !== "off";

  function isBlankArea(target) {
    if (!(target instanceof Element)) return false;
    return !target.closest(CONTENT_SELECTOR);
  }

  /* ---------- Canvas mặt nước ---------- */
  const canvas = document.createElement("canvas");
  canvas.className = "water-surface";
  canvas.setAttribute("aria-hidden", "true");
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  const off = document.createElement("canvas"); // canvas độ phân giải thấp
  const offCtx = off.getContext("2d");

  let W = 0;
  let H = 0;
  let cur;
  let prev;
  let img;
  let running = false;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    W = Math.ceil(window.innerWidth / CELL) + 2;
    H = Math.ceil(window.innerHeight / CELL) + 2;
    off.width = W;
    off.height = H;
    cur = new Float32Array(W * H);
    prev = new Float32Array(W * H);
    img = offCtx.createImageData(W, H);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  resize();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });

  // Tác động lên mặt nước tại toạ độ màn hình (x, y)
  function disturb(x, y, radius, power) {
    if (!fxEnabled) return;
    const cx = Math.round(x / CELL) + 1;
    const cy = Math.round(y / CELL) + 1;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > radius) continue;
        const px = cx + dx;
        const py = cy + dy;
        if (px < 1 || py < 1 || px >= W - 1 || py >= H - 1) continue;
        // Lõm xuống theo dạng cosine để sóng tròn, mượt
        cur[py * W + px] -= power * (0.5 + 0.5 * Math.cos((Math.PI * d) / radius));
      }
    }
    if (!running) {
      running = true;
      requestAnimationFrame(step);
    }
  }

  function step() {
    const data = img.data;
    let energy = 0;

    // 1. Lan truyền sóng
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        let v =
          (cur[i - 1] + cur[i + 1] + cur[i - W] + cur[i + W]) * 0.5 - prev[i];
        v *= DAMPING;
        prev[i] = v;
      }
    }
    const t = prev;
    prev = cur;
    cur = t;

    // 2. Đổ bóng mượt theo độ dốc mặt nước (không tô đặc vùng giữa để tránh chói)
    for (let y = 1; y < H - 1; y++) {
      const row = y * W;
      for (let x = 1; x < W - 1; x++) {
        const i = row + x;
        const h = cur[i];
        const slopeX = cur[i - 1] - cur[i + 1];
        const slopeY = cur[i - W] - cur[i + W];
        const slope = Math.hypot(slopeX, slopeY);
        const mag = Math.abs(h);
        if (mag > energy) energy = mag;

        const p = i * 4;
        if (slope < 1.2) {
          data[p + 3] = 0;
          continue;
        }

        const light = slopeX * 0.6 + slopeY * 0.8; // ánh sáng chiếu từ trên-trái
        // Chuyển màu mượt từ SHADOW -> MIDTONE -> HIGHLIGHT (t từ -1 đến +1)
        const tNorm = Math.max(-1, Math.min(1, light / 90));
        let r, g, b;
        if (tNorm >= 0) {
          r = MIDTONE[0] + (HIGHLIGHT[0] - MIDTONE[0]) * tNorm;
          g = MIDTONE[1] + (HIGHLIGHT[1] - MIDTONE[1]) * tNorm;
          b = MIDTONE[2] + (HIGHLIGHT[2] - MIDTONE[2]) * tNorm;
        } else {
          const s = -tNorm;
          r = MIDTONE[0] + (SHADOW[0] - MIDTONE[0]) * s;
          g = MIDTONE[1] + (SHADOW[1] - MIDTONE[1]) * s;
          b = MIDTONE[2] + (SHADOW[2] - MIDTONE[2]) * s;
        }

        const a =
          Math.pow(Math.min(1, slope / 65), 0.75) * MAX_ALPHA;
        data[p] = r;
        data[p + 1] = g;
        data[p + 2] = b;
        data[p + 3] = a < 0.015 ? 0 : a * 255;
      }
    }

    offCtx.putImageData(img, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, -CELL, -CELL, W * CELL, H * CELL);

    // 3. Mặt nước lặng → dừng vòng lặp để tiết kiệm CPU
    if (energy < 2.5) {
      running = false;
      cur.fill(0);
      prev.fill(0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    requestAnimationFrame(step);
  }

  /* ---------- Giọt nước rơi + tia bắn (DOM) ---------- */
  function make(cls, vars) {
    const el = document.createElement("span");
    el.className = cls;
    if (vars) Object.entries(vars).forEach(([k, v]) => el.style.setProperty(k, v));
    return el;
  }

  function dropAt(x, y) {
    const root = make("water-ripple");
    root.style.left = `${x}px`;
    root.style.top = `${y}px`;
    root.setAttribute("aria-hidden", "true");

    root.appendChild(make("water-ripple__drop", { "--fall": `${DROP_FALL}ms` }));
    root.appendChild(make("water-ripple__splash", { "--delay": `${DROP_FALL}ms` }));
    const dots = 8;
    for (let i = 0; i < dots; i++) {
      root.appendChild(
        make("water-ripple__dot", {
          "--a": `${(360 / dots) * i + Math.random() * 20}deg`,
          "--d": `${28 + Math.random() * 26}px`,
          "--delay": `${DROP_FALL}ms`,
        }),
      );
    }
    document.body.appendChild(root);

    // Giọt nước chạm mặt nước → tạo sóng
    setTimeout(() => {
      disturb(x, y, CLICK_RADIUS, CLICK_POWER);
      // Giọt nảy nhẹ lần 2 (giống giọt nước thật bật lên rồi rơi lại)
      setTimeout(() => disturb(x, y, 2, CLICK_POWER * 0.35), 260);
    }, DROP_FALL);

    setTimeout(() => root.remove(), DROP_FALL + 900);
  }

  /* ---------- Nhện nước (Water Strider) chạy theo sau con trỏ ---------- */
  const strider = document.createElement("div");
  strider.className = "water-strider";
  strider.setAttribute("aria-hidden", "true");
  strider.innerHTML = `
    <svg viewBox="0 0 64 64" width="64" height="64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- Bóng mờ dưới đáy nước nhạt dịu -->
      <ellipse cx="32" cy="34" rx="3.4" ry="10.5" fill="rgba(18, 66, 82, 0.15)" />
      <!-- Lúm đồng tiền mặt nước ở đầu 6 chân -->
      <g class="water-strider__pads" stroke="rgba(72, 148, 168, 0.42)" stroke-width="1" fill="rgba(235, 248, 252, 0.24)">
        <circle class="pad-fl" cx="23" cy="11" r="2.4" />
        <circle class="pad-fr" cx="41" cy="11" r="2.4" />
        <circle class="pad-ml" cx="6" cy="29" r="3" />
        <circle class="pad-mr" cx="58" cy="29" r="3" />
        <circle class="pad-hl" cx="12" cy="55" r="2.6" />
        <circle class="pad-hr" cx="52" cy="55" r="2.6" />
      </g>
      <!-- Râu nhỏ phía trước -->
      <path class="strider-ant" d="M30.8 21 L27.5 15.5 M33.2 21 L36.5 15.5" stroke="#2c5e50" stroke-width="1.1" stroke-linecap="round" />
      <!-- 6 chân có khớp gối chuyển động độc lập (màu nhạt thanh thoát hơn) -->
      <path class="leg-fl" d="M30.5 24 L25 17 L23 11" stroke="#255447" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
      <path class="leg-fr" d="M33.5 24 L39 17 L41 11" stroke="#255447" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
      <path class="leg-ml" d="M30 29 L17 26.5 L6 29" stroke="#255447" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path class="leg-mr" d="M34 29 L47 26.5 L58 29" stroke="#255447" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
      <path class="leg-hl" d="M30.5 34 L20 43 L12 55" stroke="#255447" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
      <path class="leg-hr" d="M33.5 34 L44 43 L52 55" stroke="#255447" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" />
      <!-- Thân nhện nước (màu xanh lục nhạt tự nhiên hơn) -->
      <ellipse cx="32" cy="34.5" rx="2.6" ry="6.8" fill="#255447" />
      <ellipse cx="32" cy="27.5" rx="3" ry="4.4" fill="#316e5d" />
      <circle cx="32" cy="22.5" r="2.2" fill="#1e463b" />
      <!-- Vệt sáng bóng trên lưng -->
      <ellipse cx="31.3" cy="27" rx="0.95" ry="2.7" fill="rgba(195, 238, 228, 0.65)" />
      <ellipse cx="31.4" cy="34" rx="0.75" ry="4" fill="rgba(195, 238, 228, 0.5)" />
    </svg>
  `;
  document.body.appendChild(strider);

  const elAnt = strider.querySelector(".strider-ant");
  const elLegFL = strider.querySelector(".leg-fl");
  const elLegFR = strider.querySelector(".leg-fr");
  const elLegML = strider.querySelector(".leg-ml");
  const elLegMR = strider.querySelector(".leg-mr");
  const elLegHL = strider.querySelector(".leg-hl");
  const elLegHR = strider.querySelector(".leg-hr");
  const elPadFL = strider.querySelector(".pad-fl");
  const elPadFR = strider.querySelector(".pad-fr");
  const elPadML = strider.querySelector(".pad-ml");
  const elPadMR = strider.querySelector(".pad-mr");
  const elPadHL = strider.querySelector(".pad-hl");
  const elPadHR = strider.querySelector(".pad-hr");

  let sx = -100;
  let sy = -100;
  let tx = -100;
  let ty = -100;
  let sAngle = 0; // góc xoay hiện tại (độ, hướng lên = 0deg)
  let striderActive = false;
  let striderLooping = false;
  let lastStrideRipple = 0;
  let stridePhase = 0;
  let idlePhase = 0;
  let legAmp = 0.25; // biên độ đạp chân (tăng mạnh khi di chuyển, nhịp nhẹ khi đứng yên)

  function lerpAngle(a, b, t) {
    let diff = ((b - a + 540) % 360) - 180;
    return a + diff * t;
  }

  function animateLegs(speed) {
    // Khi chạy: nhịp chân nhanh và sải rộng; khi dừng: nhịp thở nhẹ trên mặt nước
    const targetAmp = speed > 0.2 ? Math.min(1.15, 0.48 + speed * 0.14) : 0.22;
    legAmp += (targetAmp - legAmp) * 0.18;
    stridePhase += 0.14 + Math.min(0.42, speed * 0.065);
    idlePhase += 0.06;

    // 1. Râu nhúc nhích nhẹ
    const axL = 27.5 + Math.sin(idlePhase * 1.8) * 1.2;
    const ayL = 15.5 + Math.cos(stridePhase * 0.7) * 0.9;
    const axR = 36.5 - Math.cos(idlePhase * 1.8) * 1.2;
    const ayR = 15.5 + Math.sin(stridePhase * 0.7) * 0.9;
    elAnt.setAttribute(
      "d",
      `M30.8 21 L${axL.toFixed(1)} ${ayL.toFixed(1)} M33.2 21 L${axR.toFixed(1)} ${ayR.toFixed(1)}`,
    );

    // 2. Cặp chân trước (bước so le trái - phải)
    const fL = Math.sin(stridePhase) * legAmp;
    const fR = Math.sin(stridePhase + Math.PI) * legAmp;
    const flKx = 25 - fL * 1.6,
      flKy = 17 + fL * 2.4;
    const flFx = 22.5 - fL * 2.2,
      flFy = 11 + fL * 4.2;
    const frKx = 39 + fR * 1.6,
      frKy = 17 + fR * 2.4;
    const frFx = 41.5 + fR * 2.2,
      frFy = 11 + fR * 4.2;
    elLegFL.setAttribute(
      "d",
      `M30.5 24 L${flKx.toFixed(1)} ${flKy.toFixed(1)} L${flFx.toFixed(1)} ${flFy.toFixed(1)}`,
    );
    elLegFR.setAttribute(
      "d",
      `M33.5 24 L${frKx.toFixed(1)} ${frKy.toFixed(1)} L${frFx.toFixed(1)} ${frFy.toFixed(1)}`,
    );
    elPadFL.setAttribute("cx", flFx.toFixed(1));
    elPadFL.setAttribute("cy", flFy.toFixed(1));
    elPadFR.setAttribute("cx", frFx.toFixed(1));
    elPadFR.setAttribute("cy", frFy.toFixed(1));

    // 3. Cặp chân giữa dài (chèo sải rộng từ trước ra sau + co duỗi khớp gối)
    const rowL = Math.sin(stridePhase * 0.95) * legAmp;
    const liftL = Math.cos(stridePhase * 0.95) * legAmp;
    const rowR = Math.sin(stridePhase * 0.95 + 0.35) * legAmp;
    const liftR = Math.cos(stridePhase * 0.95 + 0.35) * legAmp;
    const mlKx = 17 - liftL * 2.2,
      mlKy = 26 + rowL * 4.8;
    const mlFx = 6 + liftL * 3.2,
      mlFy = 29 + rowL * 11.5;
    const mrKx = 47 + liftR * 2.2,
      mrKy = 26 + rowR * 4.8;
    const mrFx = 58 - liftR * 3.2,
      mrFy = 29 + rowR * 11.5;
    elLegML.setAttribute(
      "d",
      `M30 29 L${mlKx.toFixed(1)} ${mlKy.toFixed(1)} L${mlFx.toFixed(1)} ${mlFy.toFixed(1)}`,
    );
    elLegMR.setAttribute(
      "d",
      `M34 29 L${mrKx.toFixed(1)} ${mrKy.toFixed(1)} L${mrFx.toFixed(1)} ${mrFy.toFixed(1)}`,
    );
    elPadML.setAttribute("cx", mlFx.toFixed(1));
    elPadML.setAttribute("cy", mlFy.toFixed(1));
    elPadMR.setAttribute("cx", mrFx.toFixed(1));
    elPadMR.setAttribute("cy", mrFy.toFixed(1));

    // 4. Cặp chân sau (đạp lái so le)
    const hL = Math.sin(stridePhase + Math.PI * 0.65) * legAmp;
    const hR = Math.sin(stridePhase + Math.PI * 1.65) * legAmp;
    const hlKx = 20 - hL * 1.8,
      hlKy = 43 + hL * 2.6;
    const hlFx = 12 - hL * 2.8,
      hlFy = 54.5 + hL * 4.8;
    const hrKx = 44 + hR * 1.8,
      hrKy = 43 + hR * 2.6;
    const hrFx = 52 + hR * 2.8,
      hrFy = 54.5 + hR * 4.8;
    elLegHL.setAttribute(
      "d",
      `M30.5 34 L${hlKx.toFixed(1)} ${hlKy.toFixed(1)} L${hlFx.toFixed(1)} ${hlFy.toFixed(1)}`,
    );
    elLegHR.setAttribute(
      "d",
      `M33.5 34 L${hrKx.toFixed(1)} ${hrKy.toFixed(1)} L${hrFx.toFixed(1)} ${hrFy.toFixed(1)}`,
    );
    elPadHL.setAttribute("cx", hlFx.toFixed(1));
    elPadHL.setAttribute("cy", hlFy.toFixed(1));
    elPadHR.setAttribute("cx", hrFx.toFixed(1));
    elPadHR.setAttribute("cy", hrFy.toFixed(1));
  }

  function updateStrider() {
    if (!striderActive) {
      striderLooping = false;
      return;
    }

    const dx = tx - sx;
    const dy = ty - sy;
    const dist = Math.hypot(dx, dy);

    // Giữ khoảng cách ~30px phía sau mũi con trỏ chuột
    const TRAIL_DIST = 30;
    let speed = 0;
    if (dist > TRAIL_DIST) {
      const stepX = (dx / dist) * (dist - TRAIL_DIST) * 0.18;
      const stepY = (dy / dist) * (dist - TRAIL_DIST) * 0.18;
      sx += stepX;
      sy += stepY;

      // Xoay đầu nhện nước hướng về phía con trỏ (SVG gốc hướng lên trên -Y)
      const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      sAngle = lerpAngle(sAngle, targetAngle, 0.24);

      speed = Math.hypot(stepX, stepY);

      // Nhện nước đạp chân tạo gợn sóng nhẹ phía sau
      const now = performance.now();
      if (speed > 1.2 && now - lastStrideRipple > 65) {
        lastStrideRipple = now;
        disturb(sx, sy, 2, Math.min(115, 55 + speed * 7));
      }
    }

    animateLegs(speed);
    strider.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${sAngle.toFixed(1)}deg)`;

    requestAnimationFrame(updateStrider);
  }

  function stopAllWaterFx() {
    running = false;
    if (cur) cur.fill(0);
    if (prev) prev.fill(0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    striderActive = false;
    striderLooping = false;
    strider.classList.remove("is-visible", "is-moving");
    document.querySelectorAll(".water-ripple").forEach((el) => el.remove());
  }

  const toggleBtn = document.getElementById("waterFxToggle");
  function syncToggleUI() {
    canvas.style.display = fxEnabled ? "" : "none";
    strider.style.display = fxEnabled ? "" : "none";
    if (!fxEnabled) stopAllWaterFx();
    if (!toggleBtn) return;
    toggleBtn.setAttribute("aria-pressed", String(fxEnabled));
    toggleBtn.classList.toggle("is-off", !fxEnabled);
    const label = toggleBtn.querySelector(".water-fx-toggle__label");
    if (label) {
      label.textContent = fxEnabled
        ? "Hiệu ứng nước: Bật"
        : "Hiệu ứng nước: Tắt";
    }
  }
  syncToggleUI();

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      fxEnabled = !fxEnabled;
      localStorage.setItem(STORAGE_KEY, fxEnabled ? "on" : "off");
      syncToggleUI();
    });
  }

  /* ---------- Sự kiện ---------- */
  let lastT = 0;
  document.addEventListener(
    "mousemove",
    (e) => {
      if (!fxEnabled) return;
      const blank = isBlankArea(e.target);
      if (!blank) {
        if (striderActive) {
          striderActive = false;
          strider.classList.remove("is-visible", "is-moving");
        }
        return;
      }

      tx = e.clientX;
      ty = e.clientY;

      if (!striderActive) {
        striderActive = true;
        // Xuất hiện ngay gần sau con trỏ khi vừa đi vào vùng nước
        if (sx < 0 && sy < 0) {
          sx = tx;
          sy = ty + 24;
        } else if (Math.hypot(tx - sx, ty - sy) > 180) {
          sx = tx - 18;
          sy = ty + 18;
        }
        strider.classList.add("is-visible");
      }

      if (!striderLooping) {
        striderLooping = true;
        requestAnimationFrame(updateStrider);
      }

      const now = performance.now();
      if (now - lastT < 38) return;
      lastT = now;
      disturb(e.clientX, e.clientY, HOVER_RADIUS, HOVER_POWER);
    },
    { passive: true },
  );

  document.addEventListener("mouseleave", () => {
    striderActive = false;
    strider.classList.remove("is-visible", "is-moving");
  });

  document.addEventListener("pointerdown", (e) => {
    if (!fxEnabled) return;
    if (!isBlankArea(e.target)) return;
    dropAt(e.clientX, e.clientY);
  });
})();
