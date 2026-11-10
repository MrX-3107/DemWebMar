/* =========================================================
   Aquabottle Việt Nam – Hiệu ứng 3D dùng chung
   Áp dụng cho: Trang chủ, Sản phẩm, Hỗ trợ, Tài khoản, Về chúng tôi
   1. Nghiêng 3D theo chuột + vệt sáng phản chiếu (tilt + glare)
   2. Xuất hiện 3D khi cuộn trang (lật nhẹ từ dưới lên)
   ========================================================= */
(function () {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  if (reduceMotion) return;

  document.body.classList.add("fx-3d");

  /* ---------- 1. Tilt 3D theo chuột ---------- */
  // [selector, góc nghiêng tối đa (độ), độ nhấc khi hover (px)]
  const TILT_TARGETS = [
    // Trang chủ
    [".banner-container", 4, 0],
    [".pain-card", 10, 6],
    [".usp-card", 10, 6],
    [".thermal-card", 7, 4],
    [".lifestyle-card", 9, 6],
    [".review-card", 9, 6],
    [".gallery__main", 6, 0],
    [".split__img", 6, 0],
    // Sản phẩm
    [".product-card", 10, 6],
    // Về chúng tôi
    [".about-stat-card", 12, 4],
    [".pillar-card", 10, 6],
    [".about-story-media", 6, 0],
    [".b2b-card", 3, 0],
    // Hỗ trợ
    [".channel-pill", 12, 2],
    [".chatbot-card", 2.5, 0],
    [".support-aside-card", 3.5, 3],
    // Tài khoản (form: nghiêng rất nhẹ, tạm dừng khi đang nhập liệu)
    [".auth-card", 3, 0],
    [".profile-sidebar-card", 4, 3],
    [".profile-main-card", 2.5, 0],
  ];

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)")
    .matches;

  function attachTilt(el, maxDeg, lift) {
    if (el.dataset.tiltBound) return;
    el.dataset.tiltBound = "true";
    el.classList.add("tilt-3d");

    // Ảnh (thẻ <img>) không chứa được phần tử con → bỏ qua vệt sáng
    if (el.tagName !== "IMG") {
      const glare = document.createElement("span");
      glare.className = "tilt-glare";
      glare.setAttribute("aria-hidden", "true");
      el.appendChild(glare);
    }

    let raf = 0;

    function onMove(e) {
      // Không nghiêng khi người dùng đang gõ trong form
      if (el.matches(":focus-within") && el.querySelector("input, textarea")) {
        reset();
        return;
      }
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width; // 0 → 1
      const py = (e.clientY - rect.top) / rect.height; // 0 → 1
      const rotY = (px - 0.5) * 2 * maxDeg;
      const rotX = (0.5 - py) * 2 * maxDeg;

      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.classList.add("is-tilting");
        el.style.transform =
          `perspective(1000px) rotateX(${rotX.toFixed(2)}deg) ` +
          `rotateY(${rotY.toFixed(2)}deg) translateY(${-lift}px)`;
        el.style.setProperty("--gx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--gy", `${(py * 100).toFixed(1)}%`);
      });
    }

    function reset() {
      cancelAnimationFrame(raf);
      el.classList.remove("is-tilting");
      el.style.transform = "";
    }

    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", reset);
  }

  function bindTilts() {
    if (!canHover) return;
    TILT_TARGETS.forEach(([sel, deg, lift]) => {
      document.querySelectorAll(sel).forEach((el) => attachTilt(el, deg, lift));
    });
  }

  /* ---------- 2. Xuất hiện 3D khi cuộn ---------- */
  // Trang chủ đã có .reveal (script.js) – CSS nâng cấp sang 3D.
  // Các trang khác: tự gắn .reveal-3d cho các khối chính.
  const REVEAL_TARGETS = [
    ".product-card",
    ".about-stat-card",
    ".about-story-media",
    ".about-story-content",
    ".pillar-card",
    ".b2b-card",
    ".support-hero",
    ".chatbot-card",
    ".support-aside-card",
    ".auth-card",
  ];

  function bindReveals() {
    const els = [];
    REVEAL_TARGETS.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el, i) => {
        if (el.classList.contains("reveal") || el.dataset.reveal3d) return;
        el.dataset.reveal3d = "true";
        el.classList.add("reveal-3d");
        el.style.transitionDelay = `${(i % 4) * 90}ms`;
        els.push(el);
      });
    });

    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          el.classList.add("is-in");
          // Bỏ delay sau khi xuất hiện để tilt phản hồi tức thì
          setTimeout(() => (el.style.transitionDelay = ""), 1200);
          io.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px 0px" },
    );
    els.forEach((el) => io.observe(el));
  }

  function init() {
    bindReveals();
    bindTilts();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

