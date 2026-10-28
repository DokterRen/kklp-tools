/* Shared helpers for the document tools: form binding, local archive, A4 preview, print and PDF export.
   Everything stays in this browser (localStorage); nothing is sent to a server. */
(function () {
  "use strict";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const BLN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  function fmtDate(iso, style) {
    if (!iso) return "";
    const p = String(iso).split("-"); if (p.length !== 3) return iso;
    const d = Number(p[2]), m = Number(p[1]) - 1, y = p[0];
    if (style === "num") return String(d).padStart(2, "0") + "/" + String(m + 1).padStart(2, "0") + "/" + y;
    if (style === "short") return d + " " + (BLN[m] || "").slice(0, 3) + " " + y;
    return d + " " + (BLN[m] || "") + " " + y;
  }
  function today() { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  let toastT = null;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2800);
  }
  function slug(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40); }
  function download(filename, data, type) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: type || "application/octet-stream" });
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  /* Shrink text in [data-fit] boxes until it fits (single-line: width; multi-line: height). */
  function fitText(root) {
    $$("[data-fit]", root).forEach((el) => {
      el.style.fontSize = ""; el.style.whiteSpace = ""; el.style.lineHeight = ""; el.style.alignItems = ""; el.style.paddingTop = ""; el.style.paddingBottom = "";
      if (!el.textContent.trim()) return;
      const min = Number(el.dataset.fit) || 8, wrapAt = Number(el.dataset.wrap) || 0;
      let size = parseFloat(getComputedStyle(el).fontSize), guard = 0;
      const over = () => el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5;
      // single-line boxes with data-wrap: shrink to that size first, then allow two lines
      while (over() && size > Math.max(min, wrapAt) && guard++ < 40) { size -= 0.5; el.style.fontSize = size + "px"; }
      // top-align when wrapping so any overflow lands at the bottom, where scrollHeight can see it
      if (over() && wrapAt) { el.style.whiteSpace = "normal"; el.style.lineHeight = "1.02"; el.style.alignItems = "flex-start"; el.style.paddingTop = "1px"; el.style.paddingBottom = "0px"; }
      while (over() && size > min && guard++ < 80) { size -= 0.5; el.style.fontSize = size + "px"; }
      if (el.style.whiteSpace === "normal") {
        const r = document.createRange(); r.selectNodeContents(el);
        const tops = new Set(Array.from(r.getClientRects()).map((q) => Math.round(q.top)));
        if (tops.size <= 1) { el.style.alignItems = ""; el.style.paddingTop = ""; el.style.paddingBottom = ""; }  // ended up on one line: sit on the rule again
      }
    });
  }
  /* Scale the 794×1123 sheets to fit the preview column. */
  function scalePages() {
    const pages = $(".pages"); if (!pages) return;
    const avail = pages.clientWidth - 6;
    const s = Math.min(1, Math.max(0.2, avail / 794));
    $$(".pagebox", pages).forEach((box) => {
      const sh = box.firstElementChild;
      box.style.width = Math.floor(794 * s) + "px"; box.style.height = Math.floor(1123 * s) + "px";
      sh.style.transform = "scale(" + s + ")";
    });
  }
  async function pdfFromSheets(filename) {
    if (!window.html2canvas || !window.jspdf) { toast("Pembuat PDF belum termuat. Periksa koneksi internet, lalu coba lagi."); return; }
    toast("Menyiapkan PDF…");
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    const holder = document.createElement("div");
    holder.style.cssText = "position:fixed;left:-12000px;top:0;width:794px;";
    document.body.appendChild(holder);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    try {
      const sheets = $$(".pagebox > .sheet");
      for (let i = 0; i < sheets.length; i++) {
        const clone = sheets[i].cloneNode(true); clone.style.transform = "none";
        holder.innerHTML = ""; holder.appendChild(clone);
        const canvas = await window.html2canvas(clone, { scale: 2.5, backgroundColor: "#FFFFFF", logging: false, width: 794, height: 1123, windowWidth: 794 });
        if (i > 0) doc.addPage("a4", "portrait");
        doc.addImage(canvas.toDataURL("image/jpeg", 0.93), "JPEG", 0, 0, 210, 297);
      }
      download(filename, doc.output("blob"));
      toast("PDF diunduh: " + filename);
    } catch (e) { toast("PDF gagal dibuat. Gunakan tombol Cetak / Simpan PDF."); }
    holder.remove();
  }
  async function printSheets() {
    try { await document.fonts.ready; } catch (e) { /* ignore */ }
    window.print();
  }

  /* ---------------- document tool controller ---------------- */
  function docTool(cfg) {
    const DRAFT = cfg.key + "-draft", ARSIP = cfg.key + "-arsip", ID_KEY = "kklp-identitas";
    let state = Object.assign(cfg.defaults(), store.get(DRAFT, {}) || {});
    const form = $(cfg.form || "#form");

    function getVal(k) { return state[k] == null ? "" : state[k]; }
    function writeForm() {
      $$("[data-k]", form).forEach((el) => {
        const k = el.dataset.k;
        if (el.type === "checkbox") el.checked = !!state[k];
        else if (el.type === "radio") el.checked = String(state[k] || "") === el.value;
        else el.value = getVal(k);
      });
      updateRows();
    }
    function updateRows() {
      $$("[data-rows]", form).forEach((grp) => {
        const rows = $$(".rowin", grp), min = Number(grp.dataset.min) || 3;
        let last = -1;
        rows.forEach((r, i) => { if ($$("[data-k]", r).some((el) => String(getVal(el.dataset.k)).trim())) last = i; });
        const show = Math.min(rows.length, Math.max(min, last + 2));
        rows.forEach((r, i) => { r.hidden = i >= show; });
        const c = grp.closest("details") && grp.closest("details").querySelector(".count");
        if (c) c.textContent = (last + 1 > 0 ? (rows.filter((r) => $$("[data-k]", r).some((el) => String(getVal(el.dataset.k)).trim())).length) : 0) + " / " + rows.length;
      });
    }
    let saveT = null;
    function persist() { clearTimeout(saveT); saveT = setTimeout(() => store.set(DRAFT, state), 250); }
    function render() { cfg.render(state, api); fitText($(".pages")); markOverflow(); }
    function markOverflow() {
      // flag inputs whose printed text had to shrink to its minimum (likely cut off)
      $$("[data-k]", form).forEach((el) => el.classList.remove("over"));
      $$("[data-fit][data-src]", $(".pages")).forEach((el) => {
        const min = Number(el.dataset.fit) || 8;
        if (parseFloat(el.style.fontSize || "99") <= min && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) {
          const inp = form.querySelector('[data-k="' + el.dataset.src + '"]'); if (inp) inp.classList.add("over");
        }
      });
    }
    function onField(ev) {
      const el = ev.target; if (!el.dataset || !el.dataset.k) return;
      const k = el.dataset.k;
      if (el.type === "checkbox") state[k] = el.checked;
      else if (el.type === "radio") { if (el.checked) state[k] = el.value; }
      else state[k] = el.value;
      if (el.dataset.id) shareIdentity();
      persist(); updateRows(); render();
    }
    form.addEventListener("input", onField);
    form.addEventListener("change", onField);

    /* identity shared between tools (same browser only) */
    function shareIdentity() {
      const id = { nama: state.nama || "", rm: state.rm || "", tglLahir: state.tglLahir || "", ts: Date.now() };
      if (id.nama || id.rm) store.set(ID_KEY, id);
    }
    function offerIdentity() {
      const box = $("#idhint"); if (!box) return;
      const id = store.get(ID_KEY, null);
      if (!id || (!id.nama && !id.rm) || (state.nama || state.rm)) { box.hidden = true; return; }
      box.innerHTML = '<span>Pasien terakhir di alat lain: <b>' + esc(id.nama || "-") + "</b>" + (id.rm ? " · RM " + esc(id.rm) : "") + '</span><button class="btn sm" type="button" id="id-use">Pakai identitas ini</button>';
      box.hidden = false;
      $("#id-use").onclick = () => {
        state.nama = id.nama; state.rm = id.rm; if ("tglLahir" in state && id.tglLahir) state.tglLahir = id.tglLahir;
        box.hidden = true; writeForm(); persist(); render(); toast("Identitas pasien diisi");
      };
    }

    /* local archive of saved patients */
    function archive() { return store.get(ARSIP, []) || []; }
    function renderArchive() {
      const box = $("#archive"); if (!box) return;
      const list = archive().sort((a, b) => b.saved - a.saved);
      const q = ($("#arsip-cari") && $("#arsip-cari").value || "").toLowerCase();
      const shown = list.filter((r) => !q || (r.nama + " " + r.rm).toLowerCase().includes(q));
      const c = $("#arsip-count"); if (c) c.textContent = list.length;
      box.innerHTML = shown.length ? shown.map((r) => '<div class="arow"><div class="t"><b>' + esc(r.nama || "(tanpa nama)") + "</b><span>" +
        esc([r.rm ? "RM " + r.rm : "", "disimpan " + new Date(r.saved).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })].filter(Boolean).join(" · ")) +
        '</span></div><button class="btn sm" type="button" data-open="' + r.id + '">Buka</button><button class="x" type="button" data-del="' + r.id + '" aria-label="Hapus ' + esc(r.nama) + '">×</button></div>').join("")
        : '<p class="note">' + (list.length ? "Tidak ada yang cocok." : "Belum ada pasien tersimpan di perangkat ini.") + "</p>";
    }
    let armedDel = null;
    if ($("#archive")) {
      $("#archive").addEventListener("click", (ev) => {
        const b = ev.target.closest("button"); if (!b) return;
        if (b.dataset.open) {
          const r = archive().find((x) => x.id === b.dataset.open); if (!r) return;
          state = Object.assign(cfg.defaults(), r.data); writeForm(); persist(); render(); offerIdentity(); shareIdentity();
          toast("Dibuka: " + (r.nama || "pasien")); setView("form");
        }
        if (b.dataset.del) {
          if (armedDel !== b.dataset.del) { armedDel = b.dataset.del; b.textContent = "Hapus?"; b.style.fontSize = "13px"; setTimeout(() => { if (armedDel === b.dataset.del) { armedDel = null; renderArchive(); } }, 3000); return; }
          store.set(ARSIP, archive().filter((x) => x.id !== b.dataset.del)); armedDel = null; renderArchive(); toast("Dihapus dari daftar");
        }
      });
      const cari = $("#arsip-cari"); if (cari) cari.addEventListener("input", renderArchive);
    }
    function saveToArchive() {
      if (!state.nama && !state.rm) { toast("Isi nama atau No. RM pasien dulu."); return; }
      const list = archive();
      const i = list.findIndex((r) => (state.rm && r.rm === state.rm) || (!state.rm && !r.rm && r.nama === state.nama));
      const rec = { id: i >= 0 ? list[i].id : "p" + Date.now().toString(36), nama: state.nama || "", rm: state.rm || "", saved: Date.now(), data: JSON.parse(JSON.stringify(state)) };
      if (i >= 0) list[i] = rec; else list.push(rec);
      if (!store.set(ARSIP, list)) { toast("Penyimpanan browser penuh atau tidak tersedia."); return; }
      renderArchive(); toast(i >= 0 ? "Data pasien diperbarui di daftar" : "Disimpan ke daftar pasien");
    }

    /* buttons */
    const on = (sel, fn) => { const b = $(sel); if (b) b.addEventListener("click", fn); };
    let newArmed = false;
    on("#btn-new", (ev) => {
      const b = ev.currentTarget;
      if (!newArmed) { newArmed = true; b.dataset.label = b.textContent; b.textContent = "Klik lagi untuk mengosongkan"; b.classList.add("danger", "armed"); setTimeout(() => { if (newArmed) { newArmed = false; b.textContent = b.dataset.label; b.classList.remove("danger", "armed"); } }, 3500); return; }
      newArmed = false; b.textContent = b.dataset.label; b.classList.remove("danger", "armed");
      state = cfg.defaults(); writeForm(); persist(); render(); offerIdentity(); toast("Formulir dikosongkan");
    });
    on("#btn-sample", () => { state = Object.assign(cfg.defaults(), cfg.sample()); writeForm(); persist(); render(); toast("Contoh data dimuat"); });
    on("#btn-archive", saveToArchive);
    on("#btn-print", printSheets);
    on("#btn-pdf", () => pdfFromSheets(fileBase() + ".pdf"));
    on("#btn-json", () => { download(fileBase() + ".json", JSON.stringify({ tool: cfg.key, v: 1, data: state }, null, 1), "application/json"); toast("File data disimpan"); });
    on("#btn-open", () => $("#file-in").click());
    const fin = $("#file-in");
    if (fin) fin.addEventListener("change", () => {
      const f = fin.files && fin.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const j = JSON.parse(rd.result);
          if (!j || j.tool !== cfg.key || typeof j.data !== "object") throw new Error("x");
          state = Object.assign(cfg.defaults(), j.data); writeForm(); persist(); render(); toast("File dibuka");
        } catch (e) { toast("File tidak cocok. Pilih file .json yang disimpan dari alat ini."); }
        fin.value = "";
      };
      rd.readAsText(f);
    });
    function fileBase() { return cfg.key + (state.nama ? "-" + slug(state.nama) : "") + (state.rm ? "-" + slug(state.rm) : ""); }

    /* phone: form / preview toggle */
    function setView(v) {
      document.body.dataset.view = v;
      $$(".viewtoggle button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
      if (v === "preview") requestAnimationFrame(() => { scalePages(); fitText($(".pages")); });
    }
    $$(".viewtoggle button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    setView("form");

    let rT = null;
    window.addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(scalePages, 100); });
    const api = { get state() { return state; }, fmtDate, esc, today };
    writeForm(); render(); scalePages(); renderArchive(); offerIdentity();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { render(); scalePages(); });
    return api;
  }

  window.KKLP = { $, $$, esc, store, fmtDate, today, toast, slug, download, fitText, scalePages, docTool, printSheets };
})();
