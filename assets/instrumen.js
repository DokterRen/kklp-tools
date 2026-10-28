/* Helpers shared by the scored-instrument pages (form controls + A4 summary pieces). Requires app.js. */
(function () {
  "use strict";
  const { esc, fmtDate } = KKLP;
  const radios = (k, opts, cls) => `<div class="opts ${cls || ""}" role="radiogroup">${opts.map(([v, l]) => `<label class="opt"><input type="radio" name="${k}" data-k="${k}" value="${v}"><span>${cls === "wide" ? `<em>${v}</em>` : ""}${l}</span></label>`).join("")}</div>`;
  const card = (id, no, title, inner, open) => `<details class="card" id="sec-${id}"${open ? " open" : ""}><summary>${no ? `<span class="secno">${no}</span> ` : ""}${title} <span class="count" id="cnt-${id}"></span></summary><div class="card-body">${inner}</div></details>`;
  const pill = ([t, c]) => `<span class="pill" style="background:${c}">${esc(t)}</span>`;
  const fmt1 = (x) => (Math.round(x * 100) / 100).toFixed(2).replace(/\.?0+$/, "") || "0";
  const has = (st, k) => st[k] !== undefined && st[k] !== null && String(st[k]) !== "";
  const num = (st, k) => Number(st[k]);
  const none = `<span class="muted">belum diisi</span>`;
  const identity = () => `
      <div class="field"><label for="f-nama">Nama pasien</label><input type="text" id="f-nama" data-k="nama" data-id="1"></div>
      <div class="grid3">
        <div class="field"><label for="f-rm">No. RM</label><input type="text" id="f-rm" data-k="rm" data-id="1"></div>
        <div class="field"><label for="f-usia">Usia (th)</label><input type="text" id="f-usia" data-k="usia" inputmode="numeric" maxlength="3"></div>
        <div class="field"><label for="f-tgl">Tanggal</label><input type="date" id="f-tgl" data-k="tanggal"></div>
      </div>`;
  /* sheet header: title + optional subtitle + identity box (extra rows: [[label, value], ...]) */
  function head(st, title, sub, extra) {
    const rows = [["Pasien", st.nama], ["No. RM", st.rm], ["Usia", st.usia ? st.usia + " tahun" : ""], ["Tanggal", fmtDate(st.tanggal, "short")]].concat(extra || []);
    return `<div class="rh"><div><div class="eyebrow">KEDOKTERAN KELUARGA LAYANAN PRIMER</div><h1>${title}</h1>${sub ? `<div class="sub">${sub}</div>` : ""}</div>
      <div class="idb">${rows.map(([l, v]) => `<span>${esc(l)}</span><b>${esc(v || "")}</b>`).join("")}</div></div>`;
  }
  const foot = (st, cite, pg, total) => `<div class="foot"><span>${esc(st.footer || "")}${cite ? "<br>" + cite : ""}</span>${total ? `<span style="font-weight:700;white-space:nowrap">Halaman ${pg} / ${total}</span>` : ""}</div>`;
  const notes = (st, k, title) => `<section style="flex-grow:1;display:flex;flex-direction:column;min-height:0"><h2>${title}</h2><div class="notes" data-fit="9.5">${st[k] ? esc(st[k]) : `<span class="ph">&#160;</span>`}</div></section>`;
  window.KKLP_I = { radios, card, pill, fmt1, has, num, none, identity, head, foot, notes };
})();
