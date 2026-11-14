/* Raise · version 7 screens, made to work.
   Every list and value is drawn from DATA (exported from the Raise database) or from what the parent did on this phone. */
const DATA = window.RAISE_DATA || window.RAISE_BAKED || /*DATA*/null;
/* hooks: filled in only by the hosted app (live.js): sign-in, saving to Supabase, analytics, AI doubts */
const H = window.RAISE_HOOKS || {};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const label = el => (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const noCite = t => String(t || "").replace(/\s*\[[0-9,\s]+\]/g, "");
const PASTEL = { peach: "#FAD9C1", sage: "#CFE3D6", lavender: "#DED6F2", sky: "#CFE4F5", butter: "#F8E7B0", rose: "#F6D2D8" };
const TOPICS = DATA.topics;
const bySlug = s => TOPICS.find(t => t.slug === s);
const ready = t => !!(t && t.lesson);

/* ---------------- state: this phone only ---------------- */
const fresh = () => ({ age: null, concerns: [], readiness: null, lens: "None", textSize: "Standard", discreet: false, notes: [], cur: (TOPICS.find(ready) || TOPICS[0]).slug, t: {}, rate: 1, filter: "All", myFilter: "All", seeCat: null, gateFor: null, noteAbout: "About my child" });
let S = fresh();
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem("raise-v7b") || "{}")); } catch (e) {}
const save = () => { try { localStorage.setItem("raise-v7b", JSON.stringify(S)); } catch (e) {} if (H.save) H.save(S); };
const P = (slug = S.cur) => (S.t[slug] = S.t[slug] || { stage: "new", ch: 0, sent: 0, line: 0, date: null, place: "after dinner", saved: [], debrief: {}, tries: 0 });
const T = () => bySlug(S.cur) || TOPICS[0];
/* lesson in the parent's language (Telugu / Hindi beta): text, first lines, talk card, second try. Screens stay in English. */
const LANG_NAME = { en: "English", te: "Telugu", hi: "Hindi" }, LANG_CODE = { en: "en-IN", te: "te-IN", hi: "hi-IN" };
const _lx = {};
const hasLang = (t, lg) => !!(t && t.lesson && t.lesson.tr && t.lesson.tr[lg] && Array.isArray(t.lesson.tr[lg].chapters) && t.lesson.tr[lg].chapters.length === t.lesson.chapters.length);
function LX(t){
  const b = t && t.lesson; if (!b) return b; const lg = S.lang || "en"; if (lg === "en" || !hasLang(t, lg)) return b;
  const key = t.slug + "|" + lg; if (_lx[key]) return _lx[key]; const tr = b.tr[lg];
  return _lx[key] = Object.assign({}, b, {
    chapters: b.chapters.map((c, i) => ({ n: c.n, secs: c.secs, title: tr.chapters[i].title || c.title, text: noCite(tr.chapters[i].text || c.text) })),
    first_lines: Array.isArray(tr.first_lines) && tr.first_lines.length === 3 ? tr.first_lines : b.first_lines,
    talk_card: Object.assign({}, b.talk_card || {}, tr.talk_card || {}), say: (tr.talk_card && (tr.talk_card.ask || tr.talk_card.open)) || b.say,
    second_try: tr.second_try ? Object.assign({}, b.second_try || {}, tr.second_try) : b.second_try, sparks: Array.isArray(tr.sparks) && tr.sparks.length ? tr.sparks : b.sparks,
    audio: [], lang: lg, title: tr.title || t.title });
}
const L = () => LX(T());
let playing = false;
/* a different line to say for each chapter: the lesson's first lines, talk-card lines, second-try lines and curiosity questions, in turn */
function linesPool(){ const l = L(); if (!l) return []; const tc = l.talk_card || {}, st = l.second_try || {};
  const pool = [...(l.first_lines || []), tc.ask, tc.open, st.repair_line, st.new_way_in, ...(l.sparks || [])].map(x => noCite(x || "").replace(/^["'“]+|["'”]+$/g, "").trim()).filter(x => x.length > 8);
  return [...new Set(pool)]; }
const sparkList = () => { const l = L(); return l ? [...new Set((l.sparks || []).map(x => noCite(x || "").trim()).filter(x => x.length > 8))] : []; };
const chLine = i => { const pool = linesPool(); return pool.length ? pool[i % pool.length] : (L() ? L().say : ""); };
/* lesson language switch, shown wherever a lesson is read, heard or planned */
const LANGS = [["en", "English"], ["te", "తెలుగు"], ["hi", "हिन्दी"]];
const LB_ON = "border:none;font-family:inherit;cursor:pointer;height:34px;padding:0 14px;border-radius:17px;font-size:14px;font-weight:700;background:#4A2C5A;color:#FFFFFF;flex:0 0 auto";
const LB_OFF = "border:none;font-family:inherit;cursor:pointer;height:34px;padding:0 14px;border-radius:17px;font-size:14px;font-weight:700;background:#FFFFFF;color:#4A2C5A;box-shadow:inset 0 0 0 1px #E8DFD3;flex:0 0 auto";
function langBar(){ const d = document.createElement("div"); d.dataset.b = "langbar";
  d.setAttribute("style", "display:flex;align-items:center;gap:6px;margin:10px 0 6px;flex-wrap:wrap");
  d.innerHTML = `<span style="font-size:13px;font-weight:700;color:#6B6375;margin-right:4px">Lesson language</span>` + LANGS.map(([k, n]) => `<button data-lang="${k}" aria-label="${n === "English" ? "English" : n + " (" + LANG_NAME[k] + ")"}" style="${LB_OFF}">${n}</button>`).join("");
  return d; }
const GLOBE = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg>';
const SHORT_LANG = { en: "EN", te: "తె", hi: "हि" };
function langBtn(kind){ const b = document.createElement("button"); b.dataset.act = "langmenu"; b.dataset.langlabel = kind; b.setAttribute("aria-label", "Lesson language");
  b.setAttribute("style", kind === "col" ? "border:none;font-family:inherit;cursor:pointer;background:none;color:#6B6375;display:flex;flex-direction:column;align-items:center;font-size:14px;font-weight:600;width:52px;height:48px;justify-content:center;gap:1px"
    : "border:none;font-family:inherit;cursor:pointer;background:#FFFFFF;color:#4A2C5A;display:flex;align-items:center;gap:4px;height:36px;padding:0 10px;border-radius:18px;font-size:14px;font-weight:700;box-shadow:inset 0 0 0 1px #E8DFD3");
  return b; }
function drawLangBtns(sc){ const lg = S.lang || "en";
  $$("[data-act=langmenu]", sc).forEach(b => { const k = b.dataset.langlabel;
    if (k === "full") b.textContent = { en: "English", te: "తెలుగు", hi: "हिन्दी" }[lg];
    else if (k === "col") b.innerHTML = `${GLOBE}<span>${SHORT_LANG[lg]}</span>`;
    else b.innerHTML = `${GLOBE.replace(/22/g, "18")}<span>${SHORT_LANG[lg]}</span>`; }); }
function openLangMenu(from){
  closeLangMenu(); const ph = $("#phone"), r = from.getBoundingClientRect(), pr = ph.getBoundingClientRect(), k = pr.width / 390;
  const m = document.createElement("div"); m.id = "langmenu"; m.setAttribute("role", "menu");
  m.setAttribute("style", `position:absolute;z-index:60;right:${Math.max(12, (pr.right - r.right) / k)}px;top:${(r.bottom - pr.top) / k + 6}px;width:230px;background:#FFFFFF;border-radius:18px;box-shadow:0 12px 32px rgba(42,34,51,.22);padding:8px`);
  const t = T(), lg = S.lang || "en";
  m.innerHTML = `<div style="font-size:12.5px;font-weight:700;color:#6B6375;padding:6px 10px 4px">Lesson language</div>` + LANGS.map(([c, n]) => {
    const missing = c !== "en" && t && ready(t) && !hasLang(t, c);
    return `<button role="menuitemradio" aria-checked="${c === lg}" data-lang="${c}" style="display:flex;align-items:center;justify-content:space-between;width:100%;border:none;background:${c === lg ? "#FDEBDD" : "none"};font-family:inherit;cursor:pointer;height:46px;padding:0 10px;border-radius:12px;font-size:16px;font-weight:${c === lg ? 700 : 600};color:#2A2233;text-align:left"><span>${n}${c === "en" ? "" : ` <span style="font-size:12.5px;color:#6B6375;font-weight:600">${LANG_NAME[c]} · beta${missing ? " · not for this lesson yet" : ""}</span>`}</span>${c === lg ? "<span style=\"color:#4A2C5A\">✓</span>" : ""}</button>`; }).join("")
    + `<div style="font-size:12px;color:#6B6375;padding:6px 10px 4px;line-height:1.35">Lesson text, voice and doubts change. Buttons stay in English for now. More languages later.</div>`;
  ph.append(m); setTimeout(() => m.querySelector("[aria-checked=true]").focus(), 0); }
const closeLangMenu = () => { const m = $("#langmenu"); if (m) m.remove(); };

const WA_ICON = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24"><path fill="#1FA855" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.6a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
const ICP = {
  list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r=".9" fill="currentColor"/><circle cx="3.5" cy="12" r=".9" fill="currentColor"/><circle cx="3.5" cy="18" r=".9" fill="currentColor"/>',
  ask: '<circle cx="12" cy="12" r="9.5"/><path d="M9.2 9.2a2.9 2.9 0 0 1 5.6 1c0 1.9-2.8 2.6-2.8 2.6"/><circle cx="12" cy="16.9" r=".9" fill="currentColor"/>',
  next: '<path d="M6 5l9 7-9 7z"/><path d="M18 5v14"/>',
  say: '<path d="M20.5 14.5a2 2 0 0 1-2 2H8l-4.5 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 12.5h5"/>',
  cal: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3.5 10h17"/>',
  bulb: '<path d="M9 18h6M10 21.5h4"/><path d="M12 2.5a6.5 6.5 0 0 0-3.8 11.8c.6.5.8 1.2.8 1.9V16h6v-.2c0-.7.3-1.4.8-1.9A6.5 6.5 0 0 0 12 2.5z"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9z"/><path d="M10.3 20.5a1.9 1.9 0 0 0 3.4 0"/>',
  pen: '<path d="M16.5 3.5a2.4 2.4 0 0 1 3.4 3.4L8 18.8 3.5 20.5l1.7-4.5z"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  redo: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/>',
  play: '<path d="M7 4.5l12 7.5-12 7.5z"/>',
  check: '<circle cx="12" cy="12" r="9.5"/><path d="m8 12.3 2.7 2.7L16.2 9.5"/>',
  trash: '<path d="M3.5 6.5h17M9 6.5V4h6v2.5M18.5 6.5l-1 13.5h-11l-1-13.5"/>',
  plan: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9.5"/><path d="M12 7v5l3 2"/>',
  bookmark: '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  prev: '<path d="M18 5l-9 7 9 7z"/><path d="M6 5v14"/>' };
const ic = (n, sz = 18, col = "currentColor") => `<svg class="ic${n === "chev" ? " chev" : ""}" aria-hidden="true" width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${ICP[n]}</svg>`;
/* ratings 1 to 5, tap again to clear */
const RT_ON = "border:none;font-family:inherit;cursor:pointer;width:34px;height:34px;border-radius:17px;font-size:15px;font-weight:700;background:#4A2C5A;color:#FFFFFF;flex:0 0 auto";
const RT_OFF = "border:none;font-family:inherit;cursor:pointer;width:34px;height:34px;border-radius:17px;font-size:15px;font-weight:700;background:#F3EEE8;color:#4A2C5A;flex:0 0 auto";

/* ---------------- dates ---------------- */
const DAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const iso = d => d.toISOString().slice(0, 10);
const addDays = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d; };
const today = iso(addDays(0));
function dayLabel(isoDate){ if (!isoDate) return "Not planned"; if (isoDate === today) return "Tonight"; if (isoDate === iso(addDays(1))) return "Tomorrow"; const d = new Date(isoDate + "T12:00"); return `${DAY[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; }
const greet = () => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };
/* first name from the Google account; nothing for invisible sign-in */
const firstName = () => { const U = H.user ? H.user() : null; return U && U.name && U.name !== "Parent" ? U.name : ""; };
const greetName = () => firstName() ? `${greet()}, ${firstName()}` : greet();

/* ---------------- phone frame ---------------- */
function fit(){ const side = innerWidth > 760 && getComputedStyle($("#index")).display !== "none" ? 300 : 0, phone = innerWidth <= 500; const k = Math.min(phone ? 2 : 1, (innerHeight - (phone ? 0 : 24)) / 844, (innerWidth - side - (phone ? 0 : 16)) / 390); const p = $("#phone"); p.style.transform = `scale(${k})`; p.style.margin = `${(844 * k - 844) / 2}px ${(390 * k - 390) / 2}px`; }
addEventListener("resize", fit); fit();
let tt; function toast(t){ const el = $("#toast"); el.textContent = t; el.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => el.classList.remove("on"), 2800); }

/* ---------------- finding v7 elements ---------------- */
const scr = id => $("#s-" + id);
function byText(root, text, sel = "*"){ return $$(sel, root).filter(e => e.textContent.replace(/\s+/g, " ").trim() === text).sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0]; }
function startsText(root, text, sel = "*"){ return $$(sel, root).filter(e => e.textContent.replace(/\s+/g, " ").trim().startsWith(text)).sort((a, b) => a.querySelectorAll("*").length - b.querySelectorAll("*").length)[0]; }
const clone = el => el.cloneNode(true);
const ICON_TALK = '<svg aria-hidden="true" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#4A2C5A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v4a2.5 2.5 0 0 1-2.5 2.5H9l-3.5 3v-3A2.5 2.5 0 0 1 4 10.5z"/><path d="M18.5 9A1.5 1.5 0 0 1 20 10.5v4a2.5 2.5 0 0 1-2.5 2.5V20l-3.5-3h-2"/></svg>';

/* ---------------- capture templates once, from the untouched v7 markup ---------------- */
const TPL = {};
function captureHome(id){
  const sc = scr(id), h2 = byText(sc, "Phones and screens", "h2"); if (!h2) return;
  const head = h2.parentElement, row = head.nextElementSibling, cards = [...row.children];
  TPL.head = TPL.head || clone(head); TPL.row = TPL.row || row.cloneNode(false);
  TPL.cardBadge = TPL.cardBadge || clone(cards[0]); TPL.cardPlain = TPL.cardPlain || clone(cards[2]);
  TPL.phoneIcon = TPL.phoneIcon || cards[0].querySelector("svg").outerHTML;
  const slot = document.createElement("div"); slot.dataset.b = "rows"; slot.style.display = "contents";
  head.before(slot);
  const h2s = $$("h2", sc).filter(x => x.parentElement.querySelector("a") && x.parentElement.nextElementSibling && x.parentElement.parentElement === head.parentElement);
  h2s.forEach(x => { const hd = x.parentElement; hd.nextElementSibling.remove(); hd.remove(); });
  const chips = byText(sc, "All", "button"); if (chips) { chips.parentElement.dataset.b = "chips"; TPL.chipOn = TPL.chipOn || chips.getAttribute("style"); TPL.chipOff = TPL.chipOff || chips.nextElementSibling.getAttribute("style"); }
  const next = startsText(sc, "Your next step", "span"); if (next) { const card = next.closest("div").parentElement; card.dataset.b = "nextcard"; next.dataset.b = "nextwhen"; card.children[1].dataset.b = "nextline"; }
  const mini = $("[data-b=mini]", sc); if (mini) { mini.parentElement.parentElement.dataset.b = "minicard"; mini.previousElementSibling.dataset.b = "minititle"; }
  const g = startsText(sc, "Good evening", "h1"); if (g) g.dataset.b = "greet";
}
function capture(){
  ["Home", "Offline", "Gate", "Preview"].forEach(captureHome);
  // see all
  const sa = scr("SeeAll"), sah = $("h1", sa); sah.dataset.b = "sahead"; sah.parentElement.nextElementSibling.dataset.b = "sasub";
  const grid = sah.parentElement.nextElementSibling.nextElementSibling; grid.dataset.b = "sagrid"; TPL.saBadge = clone(grid.children[0]); TPL.saPlain = clone(grid.children[2]);
  // search
  const se = scr("Search"), note = startsText(se, "No lesson matches", "div"); const box = note.parentElement; box.dataset.b = "senote"; note.dataset.b = "senotetitle"; note.nextElementSibling.dataset.b = "semean";
  const cl = byText(se, "Closest lessons", "div"); cl.dataset.b = "selabel";
  TPL.seRow = clone(cl.nextElementSibling); let x = cl.nextElementSibling; while (x && x.tagName === "A") { const n = x.nextElementSibling; x.remove(); x = n; }
  const slot = document.createElement("div"); slot.dataset.b = "seresults"; slot.style.display = "contents"; cl.after(slot);
  const browse = byText(se, "Or browse", "div").nextElementSibling; browse.dataset.b = "sebrowse"; TPL.seChip = browse.children[0].getAttribute("style");
  // search boundary: safe alternatives come from real topics
  const sb = scr("SearchBoundary"); const sbr = $$("a", sb).filter(a => /\d+ min/.test(label(a)) && !label(a).startsWith("Worried")); if (sbr.length) { TPL.sbRow = clone(sbr[0]); const slot2 = document.createElement("div"); slot2.dataset.b = "sbresults"; slot2.style.display = "contents"; sbr[0].before(slot2); sbr.forEach(a => a.remove()); }
  // my topics
  const mt = scr("MyTopics"), week = byText(mt, "Thu12", "button") || $$("button", mt)[0]; week.parentElement.dataset.b = "week";
  TPL.dayOn = [...week.parentElement.children].map(b => b.getAttribute("style")).find((s, i, a) => a.filter(y => y === s).length === 1);
  TPL.dayOff = [...week.parentElement.children].map(b => b.getAttribute("style")).find((s, i, a) => a.filter(y => y === s).length > 1);
  TPL.dayBtn = clone(week.parentElement.children[1]);
  const filt = byText(mt, "To talk", "button").parentElement; filt.dataset.b = "myfilter";
  const hi = startsText(mt, "Phone late at night", "div").closest("div[style*='#FDEBDD']"); TPL.myHi = clone(hi); const list = hi.nextElementSibling;
  const rows = [...list.children]; TPL.myTalk = clone(rows[0]); TPL.myCont = clone(rows[1]); TPL.myDone = clone(rows[2]); TPL.mySaved = clone(rows[3]);
  hi.dataset.b = "myhi"; list.dataset.b = "mylist";
  // family note
  ["FamilyNote", "AddNote"].forEach(id => { const del = $("[aria-label='Delete this note']", scr(id)); if (!del) return; const nl = del.parentElement.parentElement; nl.dataset.b = "notes"; TPL.note = TPL.note || clone(nl.children[0]); });
  // talk card
  const tc = scr("TalkCard"); const why = byText(tc, 'If they ask "why now?"', "div"); if (why) { why.dataset.b = "tcwhyhead"; why.nextElementSibling.dataset.b = "tcwhy"; }
  // reflection
  const rf = scr("Reflection"); const p1 = startsText(rf, "Thank you for trying", "p") || startsText(rf, "Thank you for trying"); if (p1) p1.dataset.b = "rf1";
  const p2 = startsText(rf, "Next time", "p") || startsText(rf, "Next time"); if (p2) p2.dataset.b = "rf2";
  const nt = byText(rf, "When sleep goes wrong"); if (nt) { nt.dataset.b = "rfnext"; const because = startsText(rf, "Because she mentioned"); if (because) because.dataset.b = "rfwhy"; TPL.rfCard = nt.closest("div[style*='border-radius']"); }
  // debrief and gate text
  const db = startsText(scr("Debrief"), "Phone late at night · planned"); if (db) db.dataset.b = "dbsub";
  const gp = startsText(scr("Gate"), "You planned to talk about", "p"); if (gp) gp.dataset.b = "gatep";
  $$(".screen h2, .screen h1").forEach(h => { if (h.textContent.includes("Lakshmi")) h.dataset.b = "greet"; });
  // me header and rows
  $$(".screen").forEach(sc => {
    const nm = byText(sc, "Lakshmi"); if (nm) { nm.dataset.b = "meName"; const av = byText(sc, "L"); if (av) av.dataset.b = "meAvatar"; const si = byText(sc, "Signed in with Google"); if (si) si.dataset.b = "meSign"; }
    [["Language", "lang"], ["Child's age", "age"], ["My family note", "notes"], ["Text size", "textSize"], ["Discreet mode", "discreet"], ["Add a thought from", "lens"]].forEach(([p, k]) => {
      $$("a", sc).filter(a => label(a).startsWith(p)).forEach(a => { const leaves = $$("span,div", a).filter(e => !e.children.length && e.textContent.trim() && !e.textContent.trim().startsWith(p)); if (leaves.length) leaves[leaves.length - 1].dataset.v = k; });
    });
  });
  // account
  ["Account", "Delete"].forEach(id => { const em = byText(scr(id), "l•••@gmail.com"); if (em) em.dataset.b = "email"; });
  // preview sheet
  const pv = scr("Preview"), dlg = $$("h2", pv).find(h => h.textContent.includes(DATA.topics[0].title) || h.textContent.startsWith("When your teen")); if (dlg) { dlg.dataset.b = "pvtitle"; const sheet = dlg.closest("div").parentElement; const p = $("p", sheet); if (p) p.dataset.b = "pvdesc"; const ul = $("ul", sheet); if (ul) { ul.dataset.b = "pvlist"; ul.previousElementSibling.dataset.b = "pvlisthead"; ul.nextElementSibling.dataset.b = "pvmeta"; } TPL.pvIcon = dlg.previousElementSibling; }
  // closing
  const cs = scr("Closing"); const ul = $("ul", cs); if (ul) { ul.dataset.b = "srclist"; TPL.src = clone(ul.children[0]); }
  const ct = startsText(cs, DATA.topics[0].short || "Phone late at night"); if (ct) ct.dataset.b = "cltitle";
  // spark questions
  const sp = startsText(scr("Spark"), "Australia does not allow", "button"); if (sp) { sp.parentElement.dataset.b = "sparks"; TPL.spark = clone(sp); TPL.sparkOn = sp.getAttribute("style"); TPL.sparkOff = sp.nextElementSibling.getAttribute("style"); }
  // ready: reminder line and when-chips
  $$(".screen").forEach(sc => { const r = startsText(sc, "Tonight 7:30 pm"); if (r && !r.children.length) r.dataset.b = "remind"; });
  const pd = scr("PickDay"); const thu = $$("button", pd).find(b => /^Thu\s*12$/.test(label(b))); if (thu) { thu.parentElement.dataset.b = "pickweek"; TPL.pickDay = clone(thu); }
  const ps = scr("PlanSaved"); const pw = byText(ps, "Tonight, after dinner"); if (pw) pw.dataset.b = "pswhen";
  const td = scr("TopicDetail"); const pl = startsText(td, "Plan · tonight"); if (pl) pl.dataset.b = "tdplan"; const hl = startsText(td, "Heard today"); if (hl) hl.dataset.b = "tdheard";
  const sl = byText(td, "Lines I saved"); if (sl) { sl.parentElement.dataset.b = "tdsavedbox"; sl.nextElementSibling.dataset.b = "tdsaved"; }
  const h1 = $("h1", td); if (h1) h1.dataset.b = "tdtitle";
  // player templates
  $$("[data-b=dots]").forEach(d => { if (!TPL.dot) { const k = [...d.children]; TPL.dot = { done: k[0].getAttribute("style"), cur: k[2].getAttribute("style"), todo: k[7].getAttribute("style") }; } });
  const plist = $("[data-b=partslist]"); if (plist) { const b = [...plist.children]; TPL.parts = { done: b[0].outerHTML, cur: b[2].outerHTML, todo: b[3].outerHTML }; }
  const rb = $("[data-b=readbody]"); if (rb) { TPL.p = rb.querySelector("p").getAttribute("style"); TPL.box = [...rb.children].find(x => x.tagName === "DIV").outerHTML; }
  TPL.pause = $("#s-Player [data-b=playbtn]").innerHTML;
  TPL.play = '<svg aria-hidden="true" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8 5l11 7-11 7z" fill="currentColor"></path></svg>';
  const dq = $$("#s-Doubt div").find(d => !d.children.length && d.textContent.trim().startsWith("What if he says")); if (dq) { dq.dataset.b = "dq"; dq.nextElementSibling.dataset.b = "da"; }
  const paused = startsText(scr("Doubt"), "Lesson paused at"); if (paused) paused.dataset.b = "pausedat";
  // overlays: the dim layer behind every sheet closes the sheet
  $$(".screen div").forEach(d => { const s = d.getAttribute("style") || ""; if (s.includes("inset: 0") && s.includes("rgba(42,34,51")) d.dataset.overlay = "1"; });
}


/* ---------------- scrolling ----------------
   v7 screens are drawn at exactly one phone height. Everything that flows on the page moves into a scroller;
   bars pinned to the screen (bottom menu, sheets, buttons fixed at the bottom) stay put above it.
   Rows wider than the screen (chips, cards, filters, days) swipe sideways. */
function makeScrollable(){
  $$(".screen").forEach(sc => {
    const root = sc.firstElementChild; if (!root || root.dataset.scroll) return; root.dataset.scroll = "1";
    const pinned = k => /position:\s*(absolute|fixed)/.test(k.getAttribute("style") || "");
    const flow = [...root.children].filter(k => !pinned(k)); if (!flow.length) return;
    [...root.children].filter(pinned).forEach(k => { if (!/z-index/.test(k.getAttribute("style") || "")) k.style.zIndex = "1"; });
    const box = document.createElement("div"); box.className = "scroller";
    root.insertBefore(box, flow[0]); flow.forEach(k => box.appendChild(k));
    $$("*", box).concat(flow).forEach(e => { const s = e.getAttribute && e.getAttribute("style") || ""; if (/(^|;)\s*height:\s*100%/.test(s)) { e.style.height = ""; e.style.minHeight = "100%"; } });
  });
}
function fitScroll(sc, top){
  const root = sc.firstElementChild, box = root && $(".scroller", root); if (!box) return;
  // room under the content for whatever is pinned to the bottom of the screen
  let pad = 0; const H0 = root.clientHeight; [...root.children].forEach(k => { if (k === box || k.offsetParent === null) return; const s = k.getAttribute("style") || "";
    if (/position:\s*absolute/.test(s) && /bottom:/.test(s) && !/top:\s*0/.test(s) && !/inset:\s*0/.test(s) && k.offsetHeight < 300) pad = Math.max(pad, H0 - k.offsetTop); });
  box.style.paddingBottom = (pad ? pad + 16 : 24) + "px";
  if (top) box.scrollTop = 0;
  // sheets that grow up from the bottom scroll inside themselves
  [...root.children].forEach(k => { const s = k.getAttribute("style") || ""; if (k !== box && /position:\s*absolute/.test(s) && /bottom:\s*0/.test(s) && k.offsetHeight >= 300) { k.style.maxHeight = "92%"; k.style.overflowY = "auto"; } });
  // sideways rows
  $$("div, nav, ul", sc).forEach(r => { if (r.classList.contains("hscroll")) return; const cs = getComputedStyle(r);
    if (cs.display !== "flex" || cs.flexDirection !== "row" || cs.flexWrap !== "nowrap" || r.children.length < 2) return;
    if (r.closest("[data-b=bottomnav]") || r.tagName === "NAV" && r.closest("nav") === r && r.querySelector("a[href]") && r.children.length <= 4 && r.scrollWidth <= r.clientWidth + 2) return;
    if (r.scrollWidth > r.clientWidth + 4) { r.classList.add("hscroll"); [...r.children].forEach(c => c.style.flexShrink = "0"); } });
}

/* ---------------- drawing ---------------- */
/* cover image when one passed the image judge; pastel tile with icon otherwise (and always in discreet mode) */
function paint(sq, t, icon){
  if (!sq) return;
  if (t.cover && !S.discreet) { sq.style.background = `center / cover no-repeat url(${t.cover})`; sq.innerHTML = ""; sq.setAttribute("role", "img"); sq.setAttribute("aria-label", t.cover_alt || t.title); }
  else { sq.style.background = PASTEL[t.pastel] || PASTEL.peach; if (icon != null) sq.innerHTML = icon; sq.removeAttribute("role"); sq.removeAttribute("aria-label"); }
}

function card(t, big){
  const p = S.t[t.slug], badge = !ready(t) ? "Being written" : p && ["heard", "planned", "done"].includes(p.stage) ? "Heard" : p && p.stage === "listening" ? "Started" : "New";
  const el = clone(big ? TPL.saBadge : TPL.cardBadge); el.dataset.topic = t.slug;
  const sq = el.querySelector("div > div"); paint(sq, t, t.category === "Phones and screens" ? TPL.phoneIcon : ICON_TALK);
  el.querySelector("span").textContent = badge;
  const tx = [...el.children].filter(c => c.tagName === "DIV");
  tx[1].textContent = S.discreet ? t.category : t.title;
  tx[2].textContent = ready(t) ? `${t.duration_min} min` : "Lesson coming soon";
  return el;
}
const cats = () => { const all = [...new Set(TOPICS.map(t => t.category))]; return all.sort((a, b) => (S.concerns.some(c => a.startsWith(c.split(" ")[0])) ? 0 : 1) - (S.concerns.some(c => b.startsWith(c.split(" ")[0])) ? 0 : 1)); };
function drawHome(sc){
  const g = $("[data-b=greet]", sc); if (g) g.textContent = greetName();
  const chips = $("[data-b=chips]", sc);
  if (chips) chips.innerHTML = ["All", ...cats()].map(c => `<button data-cat="${esc(c)}" style="${c === S.filter ? TPL.chipOn : TPL.chipOff}">${esc(c)}</button>`).join("");
  const slot = $("[data-b=rows]", sc);
  if (slot) { slot.innerHTML = "";
    const section = (title, list, see) => { if (!list.length) return; const hd = clone(TPL.head); $("h2", hd).textContent = title; $("a", hd).dataset.see = see; slot.append(hd);
      const row = TPL.row.cloneNode(false); list.forEach(t => row.append(card(t))); slot.append(row); };
    if (S.filter === "All") {
      // every finished lesson together first, then the ones the factory is still writing
      section("Ready to listen", TOPICS.filter(ready), "All");
      section("Being written", TOPICS.filter(t => !ready(t)), "All");
    } else section(S.filter, TOPICS.filter(t => t.category === S.filter), S.filter); }
  const planned = Object.entries(S.t).find(([s, p]) => p.stage === "planned");
  const nc = $("[data-b=nextcard]", sc);
  if (nc) { nc.style.display = planned ? "" : "none";
    if (planned) { const [s, p] = planned, t = bySlug(s); $("[data-b=nextwhen]", sc).textContent = `Your next step · ${dayLabel(p.date).toLowerCase()}, ${p.place}`; $("[data-b=nextline]", sc).textContent = ready(t) ? `"${p.custom || LX(t).first_lines[p.line]}"` : ""; nc.dataset.topic = s; } }
  const mc = $("[data-b=minicard]", sc), started = Object.entries(S.t).find(([s, p]) => p.stage === "listening");
  if (mc) { mc.style.display = started ? "" : "none"; if (started) { const t = bySlug(started[0]); $("[data-b=minititle]", sc).textContent = S.discreet ? t.category : (t.short || t.title); $("[data-b=mini]", sc).textContent = `Chapter ${started[1].ch + 1} of ${t.lesson.chapters.length} · ${playing ? "playing" : "paused"}`; mc.dataset.topic = started[0]; } }
}
function drawPreview(sc){
  const t = T(), title = $("[data-b=pvtitle]", sc); if (!title) return; title.textContent = (ready(t) && LX(t).title) || t.title;
  if (TPL.pvIcon) { if (!TPL.pvIconHtml) TPL.pvIconHtml = TPL.pvIcon.innerHTML; paint(TPL.pvIcon, t, TPL.pvIconHtml); }
  const list = $("[data-b=pvlist]", sc), li = list.children[0];
  const items = ready(t) ? [t.lesson.chapters[2].title, "Three ways to begin, word for word", "How they may react, and what you can say"]
    : [noCite(t.why_parent || "Why this needs to come from you"), `In school: ${t.school_coverage || "unknown"}. ${noCite(t.school_evidence || "")}`, "The lesson is being written and checked against its sources"];
  list.innerHTML = items.map(x => { const n = clone(li); n.lastElementChild.textContent = x; return n.outerHTML; }).join("");
  $("[data-b=pvdesc]", sc).textContent = ready(t) ? noCite(t.summary).split(". ")[0] + "." : noCite(t.family_need);
  $("[data-b=pvlisthead]", sc).textContent = ready(t) ? "You will learn" : "Why this topic";
  $("[data-b=pvmeta]", sc).textContent = ready(t) ? `${t.duration_min} min · ${t.lesson.chapters.length} chapters · ${t.lesson.sources.length} research papers` : "Found by the Raise topic finder from research and reports";
  // bookmark: filled once the topic is in My topics
  const sv = $("[data-act=savelater]", sc); if (sv) { const st = (S.t[t.slug] || {}).stage, on = !!st && !["new", "removed"].includes(st);
    const path = sv.querySelector("svg path"); if (path) path.setAttribute("fill", on ? "currentColor" : "none");
    sv.lastChild.textContent = on ? (st === "saved" ? "Saved" : "In My topics") : "Save for later"; sv.style.color = on ? "#4A2C5A" : "#6B6375"; sv.setAttribute("aria-pressed", String(on)); }
}
function drawSeeAll(sc){
  const c = S.seeCat || "All", list = c === "All" ? TOPICS.filter(ready).concat(TOPICS.filter(t => !ready(t))) : TOPICS.filter(t => t.category === c);
  $("[data-b=sahead]", sc).textContent = c === "All" ? "All topics" : c;
  const r = list.filter(ready).length; $("[data-b=sasub]", sc).textContent = `${list.length} ${list.length === 1 ? "topic" : "topics"} · ${r} ready to listen`;
  const g = $("[data-b=sagrid]", sc); g.innerHTML = ""; list.forEach(t => g.append(card(t, true)));
}
function drawSearch(sc){
  const q = ($("input", sc).value || "").trim().toLowerCase();
  const hits = q ? TOPICS.filter(t => (t.title + " " + t.category + " " + (t.family_need || "")).toLowerCase().includes(q) || q.split(/\s+/).some(w => w.length > 3 && (t.title + " " + t.category).toLowerCase().includes(w))) : TOPICS;
  $("[data-b=senote]", sc).style.display = q && !hits.length ? "" : "none";
  $("[data-b=senotetitle]", sc).textContent = `No lesson matches "${q}"`; $("[data-b=semean]", sc).style.display = "none";
  $("[data-b=selabel]", sc).textContent = !q ? "All topics" : hits.length ? `Topics for "${q}"` : "Topics you can open";
  const out = $("[data-b=seresults]", sc); out.innerHTML = "";
  (hits.length ? hits : TOPICS).slice(0, 5).forEach(t => { const a = clone(TPL.seRow); a.dataset.topic = t.slug; const sq = a.querySelector("div"); paint(sq, t, ICON_TALK.replace('width="56" height="56"', 'width="34" height="34"')); const sp = a.querySelectorAll("span span"); sp[0].textContent = t.title; sp[1].textContent = ready(t) ? `${t.duration_min} min` : "Lesson coming soon"; out.append(a); });
  $("[data-b=sebrowse]", sc).innerHTML = cats().map(c => `<button data-browse="${esc(c)}" style="${TPL.seChip}">${esc(c)}</button>`).join("");
}
const myTopics = () => Object.entries(S.t).filter(([s, p]) => p.stage !== "new" && p.stage !== "removed" && bySlug(s));
function drawMyTopics(sc){
  const wk = $("[data-b=week]", sc); const planDates = myTopics().map(([s, p]) => p.stage === "planned" && p.date).filter(Boolean);
  wk.innerHTML = ""; for (let i = 0; i < 7; i++) { const d = addDays(i), b = clone(TPL.dayBtn), sp = b.querySelectorAll("span"); sp[0].textContent = DAY[d.getDay()]; sp[1].textContent = d.getDate(); b.setAttribute("style", i === 0 ? TPL.dayOn : TPL.dayOff); if (planDates.includes(iso(d))) sp[2].style.background = "#F4A261"; b.dataset.day = iso(d); wk.append(b); }
  $$("[data-b=myfilter] button", sc).forEach(b => b.setAttribute("style", label(b) === S.myFilter ? TPL.chipOn : TPL.chipOff));
  const want = { "All": () => true, "To talk": p => p.stage === "planned", "To finish": p => p.stage === "listening" || p.stage === "heard", "Done": p => p.stage === "done", "Saved": p => p.stage === "saved" }[S.myFilter];
  const mine = myTopics().filter(([s, p]) => want(p));
  const hi = $("[data-b=myhi]", sc), list = $("[data-b=mylist]", sc);
  const top = mine.find(([s, p]) => p.stage === "planned");
  hi.style.display = top ? "" : "none";
  if (top) { const [s, p] = top, t = bySlug(s), n = clone(TPL.myHi); n.dataset.b = "myhi"; n.dataset.topic = s; fillRow(n, t, `Next: talk ${dayLabel(p.date).toLowerCase()}, ${p.place}`); hi.replaceWith(n); }
  list.innerHTML = "";
  mine.filter(x => x !== top).forEach(([s, p]) => { const t = bySlug(s);
    const [tpl, sub] = p.stage === "planned" ? [TPL.myTalk, `Next: talk ${dayLabel(p.date).toLowerCase()}`] : p.stage === "listening" ? [TPL.myCont, `Next: finish listening · chapter ${p.ch + 1} of ${t.lesson.chapters.length}`]
      : p.stage === "heard" ? [TPL.myTalk, "Next: plan your talk"] : p.stage === "done" ? [TPL.myDone, `Done · talked ${dayLabel(p.talked || today)}`] : [TPL.mySaved, ready(t) ? "Saved · not started" : "Saved · lesson coming soon"];
    const n = clone(tpl); n.dataset.topic = s; fillRow(n, t, sub); const b = n.querySelector("button"); if (b && tpl === TPL.myTalk) b.textContent = p.stage === "heard" ? "Plan talk" : "Talk plan"; list.append(n); });
  if (!mine.length) list.innerHTML = `<div style="padding:20px 4px;color:#6B6375;font-size:15px">Nothing here yet.</div>`;
  $$("button, a", sc).forEach(b => { $$("*", b).concat([b]).filter(e => !e.children.length && e.textContent.trim() === "Talk card").forEach(e => e.textContent = "Talk plan"); });
  $$("[data-topic]", sc).forEach(row => { const q = S.t[row.dataset.topic]; if (!q) return; const tx = $$("div", row).filter(d => !d.children.length && d.textContent.trim()); const sub = tx[1]; if (!sub) return;
    const [cls, icn, txt] = q.stage === "done" ? ["st-done", "check", `Done · talked ${dayLabel(q.talked || today).replace("Tonight", "today")}`]
      : q.stage === "planned" ? ["st-plan", "cal", `Talk ${dayLabel(q.date).replace("Tonight", "today")} · ${q.place}`]
      : q.stage === "listening" ? ["st-go", "clock", sub.textContent.replace(/^Next: /, "").replace(/^./, c => c.toUpperCase())]
      : q.stage === "heard" ? ["st-next", "plan", "Heard · plan your talk"] : ["st-saved", "bookmark", sub.textContent];
    sub.className = "st " + cls; sub.innerHTML = `${ic(icn, 15)}<span>${esc(txt)}</span>`;
    $$("button", row).forEach(b => { if (!b.classList.contains("btn-o")) { b.classList.add("btn-o"); b.style.height = "36px"; b.style.padding = "0 12px"; b.style.fontSize = "14px"; } }); });
}
function fillRow(n, t, sub){ const sq = n.querySelector("div div") || n.querySelector("div"); const ic = $$("div", n).find(d => (d.getAttribute("style") || "").includes("width: 56px")); if (ic) paint(ic, t, ICON_TALK.replace('width="56" height="56"', 'width="30" height="30"'));
  const tx = $$("div", n).filter(d => !d.children.length && d.textContent.trim()); if (tx[0]) tx[0].textContent = S.discreet ? t.category : (t.short || t.title); if (tx[1]) tx[1].textContent = sub; }
function drawTopicDetail(sc){
  const t = T(), p = P(); $("[data-b=tdtitle]", sc).textContent = t.title;
  const h = $("[data-b=tdheard]", sc); if (h) h.textContent = !ready(t) ? "Lesson coming soon" : ["heard", "planned", "done"].includes(p.stage) ? `Heard · ${t.duration_min} min` : `Chapter ${p.ch + 1} of ${t.lesson.chapters.length} · not finished`;
  const pl = $("[data-b=tdplan]", sc); if (pl) { pl.textContent = p.date ? `Plan · ${dayLabel(p.date).toLowerCase()}, ${p.place} · reminder 7:30 pm` : "Plan · not made yet"; const ln = pl.nextElementSibling; ln.textContent = ready(t) ? `"${p.custom || t.lesson.first_lines[p.line]}"` : ""; }
  const sb = $("[data-b=tdsavedbox]", sc); if (sb) { sb.style.display = p.saved.length ? "" : "none"; $("[data-b=tdsaved]", sc).textContent = p.saved.map(x => `"${x}"`).join("  "); }
  // every talk the parent told Raise about, newest first
  let lg = $("[data-b=tdlog]", sc);
  if (!lg) { lg = document.createElement("div"); lg.dataset.b = "tdlog"; lg.setAttribute("style", "background:#FFFFFF;border-radius:18px;padding:14px 16px;margin:12px 0;font-size:14.5px;line-height:1.45"); const anchor = sb || $("[data-b=tdplan]", sc); if (anchor) (anchor.closest("div[style*='border-radius']") || anchor).after(lg); else $(".scroller", sc).append(lg); }
  const log = (p.log || []).slice().reverse();
  lg.style.display = log.length ? "" : "none";
  lg.innerHTML = `<div style="font-size:13px;font-weight:700;color:#6B6375;margin-bottom:6px">Your talks</div>` + log.map(e => `<div style="padding:8px 0;border-top:1px solid #F1EAE1"><div style="font-weight:700">${esc(dayLabel(e.date).replace("Tonight", "Today"))}${e.resp ? " · " + esc(e.resp) : ""}${e.len ? " · " + esc(e.len) : ""}${e.feel ? " · you felt " + esc(e.feel.toLowerCase()) : ""}</div>${e.said ? `<div style="font-style:italic;color:#4A3F55">"${esc(e.said)}"</div>` : ""}${e.useful ? `<div style="font-size:13px;color:#6B6375">Reflection useful: ${e.useful} of 5</div>` : ""}</div>`).join("");
}
function drawRatings(sc, store){
  $$("[data-rate]", sc).forEach(b => { const v = store && store[b.dataset.rate]; b.setAttribute("style", v === +b.dataset.n ? RT_ON : RT_OFF); b.setAttribute("aria-pressed", String(v === +b.dataset.n)); });
}
function drawNotes(sc){
  const box = $("[data-b=notes]", sc); box.innerHTML = "";
  if (!S.notes.length) { box.innerHTML = `<div style="background:#FFFFFF;border-radius:18px;padding:16px;font-size:15px;color:#6B6375">No notes yet. Add one only if you wish.</div>`; return; }
  S.notes.forEach((n, i) => { const c = clone(TPL.note), sp = c.querySelectorAll("span"); sp[0].textContent = n.about; sp[1].textContent = dayLabel(n.date).replace("Tonight", "Today"); $$("div", c).filter(d => !d.children.length).pop().textContent = n.text; c.querySelector("button").dataset.note = i; box.append(c); });
}
const RT = {
  en: { thanks: "Thank you for trying.", asked: "They asked something back. That is a good sign: they were listening.", listened: "They listened. That is a good start.", time: "You made the time for it, and that counts.",
    hardFb: "Thank you for trying. A first talk often goes like this, and it is not a failure. You opened the subject, and that is the hardest part.",
    goodNext: "Keep the door open. Thank them, and agree to try it for a few days.", closeSay: "To close warmly, you could say", later: "Later today, you could say", then: "Then", nextTry: "Next time, you could start with", calm: "Come back to it in a day or two, when you are both calm." },
  te: { thanks: "ప్రయత్నించినందుకు ధన్యవాదాలు.", asked: "వాళ్లు తిరిగి ఏదో అడిగారు. అది మంచి సంకేతం: వాళ్లు వింటున్నారు.", listened: "వాళ్లు విన్నారు. అది మంచి మొదలు.", time: "దీని కోసం మీరు సమయం కేటాయించారు, అదే ముఖ్యం.",
    hardFb: "ప్రయత్నించినందుకు ధన్యవాదాలు. మొదటి సంభాషణ తరచుగా ఇలానే జరుగుతుంది, ఇది ఓటమి కాదు. మీరు విషయాన్ని మొదలుపెట్టారు, అదే అన్నిటికంటే కష్టమైన భాగం.",
    goodNext: "సంభాషణకు దారి తెరిచే ఉంచండి. వాళ్లకు ధన్యవాదాలు చెప్పి, కొన్ని రోజులు ప్రయత్నించి చూద్దామని అంగీకరించండి.", closeSay: "ఆప్యాయంగా ముగించడానికి మీరు ఇలా చెప్పవచ్చు", later: "ఈ రోజు తర్వాత మీరు ఇలా చెప్పవచ్చు", then: "ఆ తర్వాత", nextTry: "తదుపరి సారి ఇలా మొదలుపెట్టవచ్చు", calm: "ఒకటి రెండు రోజుల్లో, ఇద్దరూ ప్రశాంతంగా ఉన్నప్పుడు మళ్లీ మాట్లాడండి." },
  hi: { thanks: "कोशिश करने के लिए धन्यवाद।", asked: "उन्होंने पलटकर कुछ पूछा। यह अच्छा संकेत है: वे सुन रहे थे।", listened: "उन्होंने सुना। यह अच्छी शुरुआत है।", time: "आपने इसके लिए समय निकाला, और यही मायने रखता है।",
    hardFb: "कोशिश करने के लिए धन्यवाद। पहली बातचीत अक्सर ऐसी ही होती है, और यह असफलता नहीं है। आपने बात शुरू की, और यही सबसे मुश्किल हिस्सा है।",
    goodNext: "बातचीत का दरवाज़ा खुला रखें। उन्हें धन्यवाद कहें, और कुछ दिन इसे आज़माने पर सहमत हों।", closeSay: "प्यार से बात खत्म करने के लिए आप कह सकते हैं", later: "आज बाद में आप कह सकते हैं", then: "फिर", nextTry: "अगली बार आप ऐसे शुरू कर सकते हैं", calm: "एक-दो दिन में, जब आप दोनों शांत हों, फिर से बात करें।" } };
const bubble = (lab, line) => `<div style="margin-top:10px"><div class="lab-ic" style="font-size:13px;font-weight:700;color:#5B3A8C;margin:0 0 4px 2px">${ic("say", 15)}${esc(lab)}</div><div class="say" style="padding:10px 14px;font-size:15.5px;line-height:1.4;color:#2A2233;margin-bottom:8px">"${esc(noCite(line))}"</div></div>`;
function drawReflection(sc){
  if (!ready(T())) return;
  const t = T(), p = P(), d = p.debrief || {}, X = LX(t), st = X.second_try || null, tc = X.talk_card || {};
  const lg = X.lang || "en", W = RT[lg] || RT.en;
  const hard = ["Went quiet", "Walked off"].includes(d.resp) || d.feel === "Upset";
  const r1 = $("[data-b=rf1]", sc), r2 = $("[data-b=rf2]", sc);
  if (hard) {
    if (r1) r1.textContent = st && st.normal ? noCite(st.normal) : W.hardFb;
    if (r2) r2.innerHTML = st ? `${st.wait ? esc(W.then) + ": " + esc(noCite(st.wait)) : ""}${bubble(W.later, st.repair_line)}${bubble(W.nextTry, st.new_way_in)}`
      : `${esc(W.calm)}${bubble(W.nextTry, X.first_lines[(p.line + 1) % 3])}`;
  } else {
    if (r1) r1.textContent = `${W.thanks} ${d.resp === "Asked something" ? W.asked : d.resp === "Listened" ? W.listened : W.time}`;
    if (r2) r2.innerHTML = `${esc(W.goodNext)}${tc.close ? bubble(W.closeSay, tc.close) : ""}`;
  }
  const next = TOPICS.find(x => x.slug !== t.slug && !(S.t[x.slug] && S.t[x.slug].stage !== "new"));
  const nt = $("[data-b=rfnext]", sc), why = $("[data-b=rfwhy]", sc);
  if (nt) { const cardEl = nt.closest("div[style*='border-radius']") || nt.parentElement; cardEl.style.display = next ? "" : "none"; if (next) { nt.textContent = next.title; if (why) why.textContent = ready(next) ? "Ready to listen now" : "Lesson being written"; cardEl.dataset.topic = next.slug; } }
  // what the parent noted about the talk, shown back to them
  let mine = $("[data-b=rfnote]", sc);
  if (!mine && r2) { mine = document.createElement("div"); mine.dataset.b = "rfnote"; mine.setAttribute("style", "margin-top:12px;background:#FFFFFF;border-radius:14px;padding:12px 14px;font-size:14.5px;line-height:1.45;color:#2A2233"); r2.after(mine); }
  if (mine) { const bits = [d.resp, d.len, d.feel && `you felt ${d.feel.toLowerCase()}`].filter(Boolean).join(" · ");
    mine.style.display = bits || d.said ? "" : "none";
    mine.innerHTML = `<div style="font-size:12.5px;font-weight:700;color:#6B6375;margin-bottom:4px">What you noted</div>${bits ? `<div>${esc(bits)}</div>` : ""}${d.said ? `<div style="margin-top:4px;font-style:italic">"${esc(d.said)}"</div>` : ""}`; }
  drawRatings(sc, p.debrief);
  let btn = $("[data-act=secondtry]", sc);
  if (!btn && r2) { btn = document.createElement("button"); btn.dataset.act = "secondtry"; btn.className = "btn-f"; btn.setAttribute("style", "margin-top:14px;align-self:flex-start"); (mine || r2).after(btn); }
  if (btn) { const bl = hard ? "Plan a second try" : "Plan the next talk"; btn.setAttribute("aria-label", bl); btn.innerHTML = `${ic(hard ? "redo" : "plan", 17)}${bl}`; btn.style.display = ready(t) ? "" : "none"; }
  // after rating (or 25 seconds), a small celebration offers the next topic
  clearTimeout(drawReflection.tm); const cel = $("#celebrate"); if (cel && cel.dataset.for !== S.cur) cel.remove();
  if (next && !p.celebrated) drawReflection.tm = setTimeout(() => celebrate(next), d.useful && d.pushed ? 900 : 25000);
}
function celebrate(next){
  if (cur !== "Reflection" || $("#celebrate")) return; const p = P(); p.celebrated = true; save();
  const c = document.createElement("div"); c.id = "celebrate"; c.dataset.for = S.cur; c.setAttribute("role", "dialog"); c.setAttribute("aria-label", "Next topic");
  c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px"><div><div style="font-size:20px;font-weight:700;color:#2A2233">🎉 You had the talk. Well done.</div><div style="font-size:14.5px;color:#6B6375;margin-top:4px">Most parents never take this first step. Ready for the next one?</div></div><button data-act="celclose" aria-label="Close" style="border:none;background:#F3EEE8;width:36px;height:36px;border-radius:18px;font-size:18px;cursor:pointer;flex:none">×</button></div>
    <div data-topic="${esc(next.slug)}" style="margin-top:12px;display:flex;gap:12px;align-items:center;background:#FFF8F0;border-radius:16px;padding:10px;cursor:pointer"><div data-b="celsq" style="width:52px;height:52px;border-radius:12px;flex:none"></div><div><div style="font-size:12.5px;font-weight:700;color:#6B6375">Next for you</div><div style="font-size:15.5px;font-weight:700;color:#2A2233">${esc(next.title)}</div><div style="font-size:13px;color:#6B6375">${ready(next) ? `${next.duration_min} min · ready to listen` : "Lesson being written"}</div></div></div>
    <div style="display:flex;gap:10px;margin-top:12px"><button data-act="celopen" data-slug="${esc(next.slug)}" style="flex:1;height:46px;border:none;border-radius:23px;background:#4A2C5A;color:#fff;font:700 16px var(--font);cursor:pointer">Open</button><button data-act="celclose" style="flex:1;height:46px;border:none;border-radius:23px;background:#F3EEE8;color:#4A2C5A;font:700 16px var(--font);cursor:pointer">Later</button></div>`;
  $("#phone").append(c); scr("Reflection").classList.add("celebrating"); paint($("[data-b=celsq]", c), next, ICON_TALK.replace('width="56" height="56"', 'width="28" height="28"'));
}
function drawCommon(sc){
  $$("[data-b=greet]", sc).forEach(g => g.textContent = g.textContent.startsWith("Welcome") ? (firstName() ? `Welcome back, ${firstName()}` : "Welcome back") : greetName());
  const U = H.user ? H.user() : null;
  $$("[data-b=meName]", sc).forEach(e => e.textContent = (U && U.name) || "Parent"); $$("[data-b=meAvatar]", sc).forEach(e => e.textContent = ((U && U.name) || "P")[0].toUpperCase()); $$("[data-b=meSign]", sc).forEach(e => e.textContent = U && U.email ? "Signed in with Google" : U ? "Not signed in · saved securely for this phone" : "Not signed in · saved on this phone only");
  $$("[data-v]", sc).forEach(e => { const k = e.dataset.v; e.textContent = k === "age" ? (S.age ? `${S.age} years` : "Not set") : k === "notes" ? (S.notes.length ? `${S.notes.length} ${S.notes.length === 1 ? "note" : "notes"}` : "None") : k === "discreet" ? (S.discreet ? "On · topic names hidden" : "Off · for shared phones") : k === "lang" ? ({ en: "English", te: "తెలుగు", hi: "हिन्दी" }[S.lang || "en"]) : S[k]; });
  $$("[data-b=email]", sc).forEach(e => e.textContent = (U && U.email) || "Not signed in yet");
}

/* ---------------- lesson player ---------------- */
const CHS = () => L().chapters;
const sentences = i => CHS()[i].text.match(/[^.!?।]+[.!?।]+["”']?|\S[^.!?।]*$/g) || [CHS()[i].text];
const mm = s => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
function drawPlayer(sc){
  if (!ready(T())) return; const p = P(), c = CHS()[p.ch], N = CHS().length, total = c.secs, done = Math.min(total, total * (p.sent / sentences(p.ch).length));
  $$("[data-b=chlabel]", sc).forEach(e => e.textContent = sc.id === "s-Read" ? `Chapter ${p.ch + 1} of ${N} · about ${Math.max(1, Math.round(c.text.split(/\s+/).length / 200))} min to read` : `Chapter ${p.ch + 1} of ${N}`);
  $$("[data-b=chtitle]", sc).forEach(e => e.textContent = c.title);
  $$("[data-b=dots]", sc).forEach(d => d.innerHTML = CHS().map((_, i) => `<div style="${i < p.ch ? TPL.dot.done : i === p.ch ? TPL.dot.cur : TPL.dot.todo}"></div>`).join(""));
  $$("[data-b=t0]", sc).forEach(e => e.textContent = mm(done)); $$("[data-b=t1]", sc).forEach(e => e.textContent = "-" + mm(total - done));
  $$("[data-b=bar]", sc).forEach(e => e.style.width = Math.round(100 * done / total) + "%");
  $$("[data-b=line]", sc).forEach(e => e.textContent = `"${chLine(p.ch)}"`);
  $$("[data-b=playbtn]", sc).forEach(e => { e.innerHTML = playing ? TPL.pause : TPL.play; e.setAttribute("aria-label", playing ? "Pause" : "Play"); });
  const rb = $("[data-b=readbody]", sc);
  if (rb) { rb.innerHTML = c.text.split(/\n+/).filter(Boolean).map(x => `<p style="${TPL.p}">${esc(x)}</p>`).join("") + TPL.box; $$("div", rb).forEach(d => { if (!d.children.length && d.textContent.trim().startsWith('"')) d.textContent = `"${chLine(p.ch)}"`; if (!d.children.length && d.textContent.trim() === "You could say") { d.innerHTML = `${ic("say", 15)}You could say`; d.classList.add("lab-ic"); } }); const bx = rb.lastElementChild; if (bx) { bx.classList.add("say"); const end = document.createElement("div"); end.className = "ch-end"; end.textContent = `End of chapter ${p.ch + 1}`; bx.before(end); } rb.style.zoom = { "Standard": 1, "Large": 1.12, "Extra large": 1.25 }[S.textSize]; }
  const pl = $("[data-b=partslist]", sc);
  if (pl) pl.innerHTML = CHS().map((x, i) => { const t = document.createElement("template"); t.innerHTML = i < p.ch ? TPL.parts.done : i === p.ch ? TPL.parts.cur : TPL.parts.todo; const b = t.content.firstElementChild, sp = b.querySelectorAll(":scope > span"); sp[0].textContent = i; sp[1].textContent = x.title; sp[sp.length - 1].textContent = mm(x.secs); if (i === p.ch && sp.length > 3) sp[2].textContent = playing ? "Playing" : "Paused"; b.dataset.ch = i; return b.outerHTML; }).join("");
  $$("[data-b=firstline]", sc).forEach(e => { if (!e.isContentEditable) e.textContent = `"${p.custom || L().first_lines[p.line]}"`; });
  $$("[data-b=remind]", sc).forEach(e => e.textContent = `${dayLabel(p.date || today)} 7:30 pm · shows as "Evening walk"`);
  const sp = $("[data-b=sparks]", sc); if (sp && !sp.querySelector("[contenteditable=true]:focus")) { const qs = sparkList(), sel = p.spark == null ? 0 : p.spark;
    sp.className = "fl-row"; sp.removeAttribute("style"); sp.innerHTML = "";
    qs.forEach((q, i) => { const b = document.createElement("div"); b.className = "fl-card" + (sel === i ? " on" : ""); b.dataset.spark = i; b.setAttribute("role", "button"); b.innerHTML = `<small>Question ${i + 1} of ${qs.length}</small>${esc(q)}`; sp.append(b); });
    const own = document.createElement("div"); own.className = "fl-card" + (sel === "custom" ? " on" : ""); own.dataset.spark = "custom"; own.setAttribute("role", "button");
    own.innerHTML = `<small>Your own message</small><div data-b="ownmsg" contenteditable="true" style="min-height:44px;outline:none" aria-label="Write your own message">${esc(p.sparkOwn || "")}</div>`; sp.append(own);
    let hint = sp.nextElementSibling && sp.nextElementSibling.dataset.b === "sparkhint" ? sp.nextElementSibling : null;
    if (!hint) { hint = document.createElement("div"); hint.dataset.b = "sparkhint"; hint.setAttribute("style", "font-size:12.5px;color:#3D6B4E;margin:-4px 2px 8px"); sp.after(hint); }
    hint.textContent = qs.length ? "Swipe for more. Only your message is sent, nothing about Raise." : "Questions for this topic are being written. You can write your own."; }
  const fr = $("[data-b=flrow]", sc); if (fr && !fr.querySelector("[contenteditable=true]")) { const fl = L().first_lines || [];
    fr.innerHTML = fl.map((x, i) => `<div class="fl-card${!p.custom && p.line === i ? " on" : ""}" data-fl="${i}" role="button"><small>Line ${i + 1} of ${fl.length}</small><span>"${esc(noCite(x))}"</span></div>`).join("")
      + (p.custom ? `<div class="fl-card on" data-fl="custom" role="button"><small>Your words</small><span>"${esc(p.custom)}"</span></div>` : "");
    const on = fr.querySelector(".on"); if (on && on.previousElementSibling) fr.scrollLeft = on.offsetLeft - 4; }
  $$(".say", sc).forEach(b => { const now = b.textContent.slice(0, 60); if (b.dataset.last && b.dataset.last !== now) { b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); } b.dataset.last = now; });
  const pw = $("[data-b=pickweek]", sc); if (pw) { pw.innerHTML = ""; for (let i = 0; i < 7; i++) { const d = addDays(i), b = clone(TPL.pickDay), s = b.querySelectorAll("span"); if (s.length >= 2) { s[0].textContent = DAY[d.getDay()]; s[1].textContent = d.getDate(); } else b.textContent = `${DAY[d.getDay()]} ${d.getDate()}`; b.dataset.date = iso(d); b.setAttribute("style", iso(d) === (p.date || "") ? TPL.dayOn || b.getAttribute("style") : TPL.dayOff || b.getAttribute("style")); pw.append(b); } }
  $$("button", sc).filter(x => ["Today", "Tomorrow", "Pick a day"].includes(label(x))).forEach((x, i, all) => { const want = !p.date || p.date === today ? "Today" : p.date === iso(addDays(1)) ? "Tomorrow" : "Pick a day"; if (label(x) === want) choose(x); });
  const ps = $("[data-b=pswhen]", sc); if (ps) ps.textContent = `${dayLabel(p.date)}, ${p.place}`;
  const pa = $("[data-b=pausedat]", sc); if (pa) pa.textContent = `Lesson paused at ${mm(done)}. Close this to continue listening.`;
}
function drawTalk(sc){
  const t = T(), p = P(); if (!ready(t)) return;
  $$("[data-b=firstline]", sc).forEach(e => e.textContent = `"${p.custom || LX(t).first_lines[p.line]}"`);
  $$("[data-b=when]", sc).forEach(e => e.textContent = `${dayLabel(p.date)} · ${p.place}`);
  const wh = $("[data-b=tcwhyhead]", sc); if (wh) { wh.textContent = "If it goes wrong"; $("[data-b=tcwhy]", sc).textContent = noCite(LX(t).talk_card.if_it_goes_wrong); }
  const db = $("[data-b=dbsub]"); if (db) db.textContent = `${t.short || t.title} · planned for ${dayLabel(p.date).toLowerCase()}`;
  const gp = $("[data-b=gatep]"); if (gp) gp.innerHTML = `You planned to talk about <strong>${esc((t.short || t.title).toLowerCase())}</strong> ${p.date === today ? "tonight" : "on " + dayLabel(p.date)}. Did you get to it?`;
}
function drawTalkPlan(sc){
  const t = T(), p = P(); if (!ready(t)) return; const planned = p.stage === "planned", d0 = p.date || today;
  $("[data-b=tptopic]", sc).textContent = (S.discreet ? t.category : (t.short || t.title)) + (planned ? ` · ${dayLabel(p.date)}, ${p.place}` : " · not planned yet");
  const chip = on => (on ? TPL.chipOn : TPL.chipOff) + ";flex:0 0 auto;scroll-snap-align:start";
  $("[data-b=tpdays]", sc).innerHTML = Array.from({ length: 7 }, (_, i) => { const d = addDays(i), v = iso(d), n = i === 0 ? "Today" : i === 1 ? "Tomorrow" : `${DAY[d.getDay()]} ${d.getDate()}`; return `<button data-tpday="${v}" aria-label="Day: ${n}" style="${chip(v === d0)}">${n}</button>`; }).join("");
  $("[data-b=tpplaces]", sc).innerHTML = ["after school", "after dinner", "on a walk", "on a phone call"].map(x => `<button data-tpplace="${x}" aria-label="Place: ${x}" style="${chip(x === p.place)}">${x[0].toUpperCase() + x.slice(1)}</button>`).join("");
  $("[data-b=tpremind]", sc).innerHTML = `${ic("bell", 15)} Reminder ${esc(dayLabel(d0).replace("Tonight", "today"))} at 7:30 pm · shows as "Evening walk"`;
  const box = $("[data-b=wabox]", sc); if (box) box.style.display = p.waOpen ? "" : "none"; const wt = $("[data-act=watoggle]", sc); if (wt) wt.setAttribute("aria-expanded", String(!!p.waOpen));
  const sv = $("[data-act=tpsave]", sc), tk = $("[data-act=tptalked]", sc), nt = $("[data-act=tpnot]", sc);
  if (sv) sv.style.display = planned ? "none" : "";
  if (tk) { if (!tk.dataset.full) tk.dataset.full = tk.getAttribute("style"); tk.setAttribute("style", planned ? tk.dataset.full : nt ? nt.getAttribute("style") : tk.dataset.full); tk.textContent = planned ? "We talked" : "We already talked"; }
  if (nt) nt.style.display = planned ? "" : "none";
}
function drawClosing(sc){
  const t = T(); if (!ready(t)) return; const ul = $("[data-b=srclist]", sc);
  ul.innerHTML = ""; t.lesson.sources.forEach(s => { const li = clone(TPL.src), sp = li.querySelectorAll("span"); sp[0].textContent = (s.publisher || "").slice(0, 48); sp[1].innerHTML = `<a href="${esc(s.url)}" target="_blank" rel="noopener" style="color:inherit">${esc(s.title)} · ${s.year}</a>`; ul.append(li); });
  const ct = $("[data-b=cltitle]", sc); if (ct) ct.textContent = `${t.short || t.title} · ${t.duration_min} min`;
  drawRatings(sc, P().lessonRating || {});
}

function drawLang(sc, id){
  // the old one-way "Show in Telugu" button is replaced by the three-language switch
  $$("button", sc).filter(b => /^Show in (Telugu|English)$/.test(label(b))).forEach(b => b.style.display = "none");
  const lg = S.lang || "en", t = T();
  $$("[data-b=langbar]", sc).forEach(bar => { $$("button", bar).forEach(b => b.setAttribute("style", b.dataset.lang === lg ? LB_ON : LB_OFF));
    let note = bar.querySelector("[data-b=langnote]"); if (!note) { note = document.createElement("div"); note.dataset.b = "langnote"; note.setAttribute("style", "flex-basis:100%;font-size:12.5px;color:#6B6375"); bar.append(note); }
    note.textContent = lg !== "en" && t && ready(t) && !hasLang(t, lg) ? `The ${LANG_NAME[lg]} version of this lesson is still being checked, so it shows in English for now.` : lg !== "en" ? "Beta: lesson text in your language. Buttons stay in English for now." : ""; });
  if (id === "Language") {
    $$("button", sc).forEach(b => { const k = label(b), lg = /Telugu|తెలుగు/.test(k) ? "te" : /Hindi|हिन्दी/.test(k) ? "hi" : /^English/.test(k) ? "en" : null; if (!lg) return;
      $$("*", b).filter(e => !e.children.length && /Coming soon|Beta/.test(e.textContent)).forEach(e => e.textContent = "Beta");
      if (lg === (S.lang || "en") && !b.dataset.on) { choose(b); } b.dataset.on = lg === (S.lang || "en") ? "1" : ""; });
  }
}
function fill(sc){
  drawCommon(sc); const id = sc.id.slice(2); drawLang(sc, id); drawLangBtns(sc);
  if (["Home", "Offline", "Gate", "Preview"].includes(id)) drawHome(sc);
  if (id === "Preview") drawPreview(sc);
  if (id === "SeeAll") drawSeeAll(sc);
  if (id === "Search") drawSearch(sc);
  if (id === "SearchBoundary") { const out = $("[data-b=sbresults]", sc); if (out) { out.innerHTML = ""; TOPICS.slice(0, 2).forEach(t => { const a = clone(TPL.sbRow); a.dataset.topic = t.slug; const sq = a.querySelector("div"); if (sq) paint(sq, t, ICON_TALK.replace('width="56" height="56"', 'width="34" height="34"')); const sp = a.querySelectorAll("span span"); if (sp.length >= 2) { sp[0].textContent = t.title; sp[1].textContent = ready(t) ? `${t.duration_min} min` : "Lesson coming soon"; } out.append(a); }); } }
  if (id === "MyTopics") drawMyTopics(sc);
  if (id === "TopicDetail") drawTopicDetail(sc);
  if (id === "FamilyNote" || id === "AddNote") drawNotes(sc);
  if (id === "Reflection") drawReflection(sc);
  if (id === "Closing") drawClosing(sc);
  if (["Player", "Read", "Parts", "Doubt", "Boundary", "Ready", "PickDay", "Spark", "PlanSaved"].includes(id)) drawPlayer(sc);
  if (["TalkCard", "Debrief", "Gate", "PlanSaved", "TopicDetail"].includes(id)) drawTalk(sc);
  if (id === "TalkCard") { drawPlayer(sc); drawTalkPlan(sc); }
}

/* ---------------- navigation ---------------- */
const hist = []; let cur = null;
function show(id, push = true){
  if (!scr(id)) return; closeLangMenu(); clearTimeout(drawReflection.tm); { const c = $("#celebrate"); if (c) c.remove(); const r = scr("Reflection"); if (r) r.classList.remove("celebrating"); }
  if (id === "MyTopics" && !myTopics().length) id = "TopicsEmpty";
  if (id === "Home" && S.gateFor && S.t[S.gateFor] && S.t[S.gateFor].stage === "planned") { S.cur = S.gateFor; S.gateFor = null; save(); id = "Gate"; }
  if (["Player", "Read", "Parts", "Ready", "PickDay", "Spark", "Closing", "TalkCard"].includes(id) && !ready(T())) { toast("This lesson is still being written."); return; }
  // history is a stack: going to a screen already in it cuts back to it, so Back never loops (e.g. Family note ⇄ Add note)
  if (cur && push && cur !== id) { const k = hist.indexOf(id); if (k >= 0) hist.splice(k); else hist.push(cur); }
  $$(".screen").forEach(s => s.hidden = true); const sc = scr(id); sc.hidden = false; cur = id; fill(sc);
  $$("#index button").forEach(b => b.setAttribute("aria-current", b.dataset.jump === id));
  if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
  fitScroll(sc, true);
  if (H.view) H.view(id, S.cur);
  if (id === "TalkCard" && !S.seenPlan) { S.seenPlan = true; save(); setTimeout(() => toast("Your talk plan: what to say, when, a WhatsApp warm-up, and what to do if it goes wrong. All in one place."), 400); }
}
const back = fb => { const p = hist.pop(); show(p || fb || "Home", false); };
const refresh = () => { const s = scr(cur); if (s) { fill(s); fitScroll(s, false); } };
function openTopic(slug, where = "Preview"){ S.cur = slug; save(); show(where); }

/* ---------------- listening ---------------- */
let audioOK = true, el = null, piece = 0;
function stop(){ playing = false; if (el) el.pause(); try { speechSynthesis.cancel(); } catch (e) {} }
function nextChapter(){ const p = P(); if (p.ch < CHS().length - 1) { p.ch++; p.sent = 0; piece = 0; save(); refresh(); if (playing) speak(); } else { stop(); if (["new", "saved", "listening"].includes(p.stage)) p.stage = "heard"; save(); show("Closing"); } }
function speak(){
  const p = P(), parts = (L().audio || []).filter(a => a.chapter === CHS()[p.ch].n);
  if (audioOK && parts.length) {
    el = el || new Audio(); el.playbackRate = S.rate; el.src = parts[Math.min(piece, parts.length - 1)].url;
    el.onended = () => { piece++; piece < parts.length ? speak() : nextChapter(); };
    el.ontimeupdate = () => { const before = parts.slice(0, piece).reduce((a, b) => a + b.seconds, 0); p.sent = Math.floor(sentences(p.ch).length * (before + el.currentTime) / CHS()[p.ch].secs); refresh(); };
    el.onerror = () => { audioOK = false; if (playing) speak(); };
    el.play().catch(() => { audioOK = false; if (playing) speak(); });
    return;
  }
  if (!("speechSynthesis" in window)) { stop(); refresh(); toast("This browser cannot read aloud. Tap Read."); return; }
  const ss = sentences(p.ch); if (p.sent >= ss.length) return nextChapter();
  const u = new SpeechSynthesisUtterance(ss[p.sent]); const lc = LANG_CODE[L().lang || "en"]; u.lang = lc; u.rate = 0.95 * S.rate;
  const vs = speechSynthesis.getVoices(), v = vs.find(x => x.lang.replace("_", "-").toLowerCase() === lc.toLowerCase()) || vs.find(x => x.lang.toLowerCase().startsWith(lc.slice(0, 2)));
  if (v) u.voice = v; else if (lc !== "en-IN" && !speak.warned) { speak.warned = true; toast(`This phone has no ${LANG_NAME[L().lang]} voice. Tap Read to follow along, or add ${LANG_NAME[L().lang]} in your phone's text-to-speech settings.`); }
  u.onend = () => { if (!playing) return; p.sent++; save(); refresh(); speak(); };
  speechSynthesis.speak(u);
}
function togglePlay(){ if (playing) { stop(); return refresh(); } const p = P(); playing = true; if (["new", "saved"].includes(p.stage)) p.stage = "listening"; save(); refresh(); speak(); }
function jump(d){ if (!ready(T())) return; const p = P(); if (el && audioOK && !el.paused) { el.currentTime = Math.max(0, el.currentTime + 10 * d); return; }
  if (d < 0 && p.sent === 0) return toast("This is the start of the chapter.");
  try { speechSynthesis.cancel(); } catch (e) {} p.sent = Math.max(0, Math.min(sentences(p.ch).length - 1, p.sent + d)); save(); refresh(); if (playing) setTimeout(speak, 80); }
function goChapter(i){ stop(); const p = P(); p.ch = i; p.sent = 0; piece = 0; if (el) el.removeAttribute("src"); if (["new", "saved"].includes(p.stage)) p.stage = "listening"; save(); }

/* ---------------- doubts, answered only from the checked lesson ---------------- */
const BOUNDARY = /\b(porn\w*|sex\w*|nude\w*|kill|suicid\w*|die|drugs?|track\w*|spy\w*|location|password\w*|hack\w*|beat|hit|slap)\b/i;
function answer(q){
  if (BOUNDARY.test(q)) return show("Boundary");
  if (H.ask && !answer.busy) {
    const dq = $("[data-b=dq]"), da = $("[data-b=da]"); dq.textContent = q; const srcStyle = (da.querySelector("div") || da).getAttribute("style") || "";
    da.innerHTML = `Thinking about your question…<div style="${srcStyle}">Answering only from this lesson and its research</div>`; answer.busy = true;
    H.ask(q, T()).then(r => { answer.busy = false; if (!r || !r.text) return localAnswer(q); if (r.boundary) return show("Boundary");
      da.innerHTML = `${esc(r.text)}<div style="${srcStyle}">${esc(r.from || "From this lesson and its sources")}</div>`; }).catch(() => { answer.busy = false; localAnswer(q); });
    return;
  }
  localAnswer(q);
}
function localAnswer(q){
  const words = (q.toLowerCase().match(/[a-z]{4,}/g) || []).filter(w => !["what","when","should","about","with","does","that","this","they","their","there","have","your"].includes(w));
  let best = null, bi = 0, score = 0;
  CHS().forEach((c, i) => { const ss = sentences(i); ss.forEach((s, j) => { const t = s.toLowerCase(); const k = words.filter(w => t.includes(w)).length; if (k > score) { score = k; best = (s + " " + (ss[j + 1] || "")).trim(); bi = i; } }); });
  const dq = $("[data-b=dq]"), da = $("[data-b=da]"); dq.textContent = q;
  const srcStyle = (da.querySelector("div") || da).getAttribute("style") || "";
  da.innerHTML = score ? `${esc(best)}<div style="${srcStyle}">From this lesson, chapter ${bi + 1} · ${esc(CHS()[bi].title)}</div>` : `This lesson does not answer that yet. For health worries, a doctor or the school counsellor is the right person.<div style="${srcStyle}">Raise answers only from its checked lessons</div>`;
}
const PRESET = { "Should I take the phone away at night?": "confiscation phone away backfire", "What if she gets angry and walks off?": "angry defensive pause tomorrow relaxed", "How much screen time is normal at 15?": "spend more than two hours smartphones sleep problems" };

/* ---------------- choices: the picked chip carries v7's selected style ---------------- */
function choose(btn, multi){
  const sibs = [...btn.parentElement.children].filter(x => x.tagName === "BUTTON"); if (sibs.length < 2) return false;
  const st = sibs.map(x => x.getAttribute("style") || ""), count = s => st.filter(y => y === s).length;
  let off = st.find(s => count(s) > 1), on = st.find(s => count(s) === 1 && s !== off);
  if (!off && sibs.length === 2 && st[0] !== st[1]) { const k = st.findIndex(s => s.includes("inset 0 0 0 2px") || s.includes("background: #4A2C5A") || s.includes("background: #FDEBDD")); const i = k < 0 ? 0 : k; on = st[i]; off = st[1 - i]; }
  if (!off) return false;
  if (!on) on = off.replace(/background: [^;]+/, "background: #FDEBDD") + "; box-shadow: inset 0 0 0 2px #4A2C5A; color: #4A2C5A";
  if (multi) { btn.setAttribute("style", btn.getAttribute("style") === on ? off : on); return true; }
  sibs.forEach(x => { if (x.getAttribute("style") === on) x.setAttribute("style", off); }); btn.setAttribute("style", on); return true;
}
const picked = (root) => { const sibs = $$("button", root); const st = sibs.map(x => x.getAttribute("style")); return sibs.filter((x, i) => st.filter(y => y === st[i]).length === 1 || (st[i] || "").includes("inset 0 0 0 2px #4A2C5A")); };

/* ---------------- what every control does ---------------- */
const GO = {
  Main: { "Continue with Google": "Q1", "Continue with phone number": "Phone", "Urgent? Get help": "Help", "What Raise stores": "Stores", "Privacy": "Stores", "English": "Language" },
  GoogleFail: { "Retry": "Q1", "Continue with Google": "Q1", "Continue with phone number": "Phone", "Urgent? Get help": "Help", "What Raise stores": "Stores", "Privacy": "Stores", "English": "Language" },
  Phone: { "Use Google instead": "Q1" }, Otp: { "Change number": "Phone", "Verify": "Q1" },
  Home: { "Help": "Help", "Not today": "NotYet" }, Offline: { "Help": "Help", "Not today": "NotYet" },
  Gate: { "Close": "Home", "Ask me later": "Home", "Yes, tell Raise how it went": "Debrief", "Not yet, move it": "NotYet" },
  SearchBoundary: {}, Preview: { "Close": "Home" },
  Player: { "Minimise": "Home", "Ask a doubt": "Doubt", "I am ready to talk": "TalkCard" }, Read: { "Minimise": "Home", "Ask a doubt": "Doubt", "I am ready to talk": "TalkCard" },
  Closing: { "Minimise": "Home", "I am ready to talk": "TalkCard", "Not now": "Home" },
  Ready: { "Pick a day": "PickDay" }, Spark: { "Pick a day": "PickDay" }, PickDay: {},
  PlanSaved: { "Close": "MyTopics", "Done": "MyTopics", "Undo": "Ready" },
  TopicDetail: { "Open talk card": "TalkCard", "Open talk plan": "TalkCard", "Change plan": "TalkCard", "We talked": "Debrief" }, TopicsEmpty: { "Find a topic": "Home" },
  TalkCard: { "We talked": "Debrief", "Not today": "NotYet" },
  Debrief: { "Close": "MyTopics", "We have not talked yet": "NotYet" },
  NotYet: { "Close": "TalkCard" }, Reflection: { "Close": "MyTopics", "Later": "MyTopics" },
  FamilyNote: { "Add a note": "AddNote" }, AddNote: { "Close": "FamilyNote" },
  Stores: { "Delete everything": "Delete" }, Account: { "Sign out": "Main", "What Raise stores": "Stores", "Delete everything": "Delete" },
  Delete: { "Close": "Account", "Keep my account": "Account", "Sign out": "Main", "What Raise stores": "Stores" },
};
const ME = { "Get help": "Help", "Child's age": "Q1", "My family note": "FamilyNote", "Language": "Language", "Text size": "TextSize", "Discreet mode": "Discreet", "Add a thought from": "Lens", "What Raise stores": "Stores", "How lessons are checked": "Checked", "Account and sign-in": "Account", "Your plan": "Plan" };
const SHEETS_OVER_ME = ["Help", "Language", "TextSize", "Discreet", "Lens"];
const PLAYER_FAMILY = ["Player", "Parts", "Doubt", "Boundary", "Ready", "PickDay", "Spark", "PlanSaved"];

function handle(t){
  const k = label(t), sc = cur, p = P();
  if (H.click && H.click(sc, k, t)) return;
  // lesson controls do nothing for a topic whose lesson is still being written
  if (PLAYER_FAMILY.concat(["Read", "Closing", "TalkCard"]).includes(sc) && !ready(T()) && !t.closest("nav") && !t.dataset.overlay && !["Close", "Minimise", "Back"].includes(k)) return toast("This lesson is still being written.");
  if (t.dataset.overlay) { const c = $$("button", scr(sc)).find(b => ["Close", "Minimise"].includes(label(b)) && !b.closest("[data-overlay]")); if (sc === "Preview") return show("Home"); if (sc === "Gate") return show("Home"); return SHEETS_OVER_ME.includes(sc) ? back("Me") : (c ? handle(c) : back()); }
  if (t.closest("nav")) { const to = { "Home": "Home", "My topics": "MyTopics", "Me": "Me" }[k]; if (to) { stop(); hist.length = 0; if (to === "Home") S.filter = "All"; return show(to); } }
  if (t.tagName === "A" && SHEETS_OVER_ME.concat(["Me"]).includes(sc)) { for (const [pre, to] of Object.entries(ME)) if (k.startsWith(pre)) return sc === to ? toast("You are here.") : show(to); }
  if (SHEETS_OVER_ME.includes(sc) && k === "Close") return back("Me");
  // lesson language, from any lesson screen
  if (t.dataset.lang) { const lg = t.dataset.lang; if ((S.lang || "en") === lg) return; stop(); S.lang = lg; Object.values(S.t).forEach(q => { q.sent = 0; }); save(); refresh();
    const x = T(), inLesson = PLAYER_FAMILY.concat(["Read", "Preview", "TalkCard", "Closing"]).includes(sc), n = TOPICS.filter(y => ready(y) && hasLang(y, lg)).length;
    if (lg === "en") return toast("Lessons in English.");
    return toast(inLesson && x && ready(x) && !hasLang(x, lg) ? `This lesson's ${LANG_NAME[lg]} version is still being checked, so it stays in English for now. ${n} other lessons are ready in ${LANG_NAME[lg]}.` : `Lessons in ${LANG_NAME[lg]} (beta): ${n} ready. Buttons stay in English for now.`); }
  // ratings 1 to 5; tapping the chosen number again clears it
  if (t.dataset.rate) { const store = sc === "Closing" ? (p.lessonRating = p.lessonRating || {}) : p.debrief; const v = +t.dataset.n;
    if (store[t.dataset.rate] === v) delete store[t.dataset.rate]; else store[t.dataset.rate] = v;
    if (sc === "Reflection" && p.log && p.log.length) p.log[p.log.length - 1][t.dataset.rate] = store[t.dataset.rate];
    save(); if (H.rate) H.rate(t.dataset.rate, store[t.dataset.rate] || null, S.cur); refresh(); return store[t.dataset.rate] ? toast("Thank you. This helps Raise improve.") : toast("Cleared."); }
  if (k === "Back" && sc === "FamilyNote") { hist.length = 0; return show("Me"); }
  if (k === "Back") { stop(); return back(sc === "Phone" ? "Main" : sc === "TalkCard" || sc === "TopicDetail" ? "MyTopics" : "Home"); }
  if (k === "Terms") return toast("Raise gives information for parents, not medical or legal advice. In danger, call 1098 or 14416.");
  if (k.startsWith("Send the code again")) return toast("You can ask for a new code in 0:24.");
  if (k.startsWith("Call me and read the code")) return toast("An automated call reads the code aloud. It needs the hosted app.");
  if (k.startsWith("Use Google instead")) return show("Q1");
  if (k.startsWith("Worried about his safety")) return show("Help");

  // onboarding
  if (sc === "Q1" && /^1[4-8] years$/.test(k)) { choose(t); S.age = parseInt(k); save(); return; }
  if (sc === "Q2" && t.tagName === "BUTTON" && !["Back", "Skip", "Continue"].includes(k)) { choose(t, true); S.concerns = picked(t.parentElement).map(label); save(); return; }
  if (sc === "Q3" && /^\d of 5$/.test(k)) { choose(t); S.readiness = parseInt(k); save(); return; }
  if (sc === "Q1" && ["Continue", "Skip"].includes(k)) { if (k === "Skip") { S.age = null; save(); } return show(hist.includes("Me") ? "Me" : "Q2"); }
  if (sc === "Q2" && ["Continue", "Skip"].includes(k)) { const typed = $("#s-Q2 input").value.trim(); if (typed) S.concerns.push(typed); save(); return show("Q3"); }
  if (sc === "Q3" && ["Show my topics", "Skip"].includes(k)) { hist.length = 0; return show("Home"); }

  // home, see all, search
  if (t.dataset.cat) { S.filter = t.dataset.cat; return refresh(); }
  if (t.dataset.see) { S.seeCat = t.dataset.see; return show("SeeAll"); }
  if (t.dataset.browse) { const i = $("#s-Search input"); i.value = t.dataset.browse; return refresh(); }
  if (t.dataset.topic && (t.tagName === "A" || (t.tagName !== "BUTTON" && sc !== "MyTopics"))) return openTopic(t.dataset.topic);
  if (k === "Open talk card" || k === "Open talk plan") { const nc = t.closest("[data-topic]"); if (nc) S.cur = nc.dataset.topic; return show("TalkCard"); }
  if (k === "Play" && ["Home", "Offline", "Gate", "Preview"].includes(sc)) { const mc = t.closest("[data-topic]"); if (mc) S.cur = mc.dataset.topic; return show("Player"); }
  if (k === "Clear search") { $(`#s-${sc} input`).value = ""; if (sc === "SearchBoundary") return show("Search"); return refresh(); }
  if (k === "Ask Raise to add this topic") { const q = (($(`#s-${sc} input`) || {}).value || "").trim();
    if (!q) return toast("Type the topic in the search box first.");
    if (!H.request) return toast("Request noted on this phone.");
    H.request(q, S.lang || "en").then(ok => toast(ok ? `Sent: "${q}". The topic finder reads what parents ask for when it chooses new topics.` : "Could not send right now. Please try again when you are online."));
    return; }
  if (sc === "Preview" && ["Listen", "Read instead"].includes(k)) { if (!ready(T())) return toast("This lesson is still being written. It appears here once it passes its checks."); if (["new"].includes(p.stage)) p.stage = "listening"; save(); return show(k === "Listen" ? "Player" : "Read"); }
  if (t.dataset.act === "savelater" || k === "Save for later") {
    if (p.stage === "saved") { p.stage = "new"; save(); refresh(); return toast("Removed from Saved."); }
    if (["new", "removed"].includes(p.stage)) { p.stage = "saved"; save(); refresh(); return toast("Saved. Find it in My topics, under Saved."); }
    return toast("This topic is already in My topics."); }

  // lesson
  if (t.dataset.ch !== undefined) { goChapter(+t.dataset.ch); return show(S.from || "Player"); }
  if (["Pause", "Play"].includes(k) && PLAYER_FAMILY.includes(sc)) return togglePlay();
  if (k === "Previous chapter") { stop(); if (p.ch > 0) { goChapter(p.ch - 1); return refresh(); } return toast("This is the first chapter."); }
  if (k === "Back 10 seconds") return jump(-1);
  if (k === "Forward 10 seconds") return jump(1);
  if (k === "Save this line") { const ln = chLine(p.ch); if (p.saved.includes(ln)) return toast("You already saved this line."); p.saved.push(ln); save(); return toast("Line saved. It waits in this topic in My topics."); }
  if (/^(0\.8|1|1\.25)x$/.test(k)) { S.rate = parseFloat(k); if (el) el.playbackRate = S.rate; save(); choose(t); return toast(`Speed ${k}`); }
  if (k === "Next chapter") { stop(); if (p.ch < CHS().length - 1) { goChapter(p.ch + 1); return refresh(); } if (["listening", "saved", "new"].includes(p.stage)) p.stage = "heard"; save(); return show("Closing"); }
  if (k === "Read" && sc !== "Read") { stop(); S.from = "Read"; return show("Read"); }
  if (k === "Listen" && sc !== "Player" && sc !== "Preview") { S.from = "Player"; return show("Player"); }
  if (k === "Listen" && sc === "Player") return toast("You are listening.");
  if (k === "Read" && sc === "Read") return toast("You are reading.");
  if (k === "Chapters") { S.from = sc === "Read" ? "Read" : "Player"; if (sc === "Parts") return show(S.from); stop(); return show("Parts"); }
  if (k === "Minimise" && PLAYER_FAMILY.includes(sc)) { stop(); return show("Home"); }
  if (["Parts", "Doubt", "Boundary", "Ready", "PickDay", "Spark"].includes(sc) && k === "Close") return show(S.from || "Player");
  if (k === "Ask a doubt") { stop(); if (sc === "Doubt") return $("#s-Doubt input").focus(); return show("Doubt"); }
  if (sc === "Doubt" && PRESET[k]) { answer(PRESET[k]); $("[data-b=dq]").textContent = k; return; }
  if (k === "Go to: How to begin") { goChapter(5); return show("Player"); }
  if (k === "Get help") return show("Help");
  if (k === "I am ready to talk") { stop(); return show("TalkCard"); }

  // plan
  if (k === "See 2 other lines") { p.line = (p.line + 1) % L().first_lines.length; p.custom = null; save(); return refresh(); }
  if (k === "Edit line") { const f = $(`#s-${sc} [data-b=firstline]`); f.contentEditable = "true"; f.focus(); return toast("Type your own words, then tap Save my plan."); }
  if (k === "Show in Telugu") { if (!hasLang(T(), "te")) return toast("The Telugu version of this lesson is still being prepared."); S.lang = "te"; save(); refresh(); return toast("Showing this lesson in Telugu (beta)."); }
  if (k === "Show in English") { S.lang = "en"; save(); refresh(); return toast("Showing this lesson in English."); }
  if (t.getAttribute("role") === "switch") { const on = t.getAttribute("aria-checked") === "true";
    if (k.startsWith("Send a curiosity question") || k.startsWith("Warm up on WhatsApp")) return show(on ? "Ready" : "Spark");
    if (k.startsWith("Hide topic names")) { S.discreet = !on; save(); }
    t.setAttribute("aria-checked", String(!on)); const knob = t.lastElementChild; if (knob) { knob.style.background = !on ? "#4A2C5A" : "#D8CFDD"; const dot = knob.firstElementChild; if (dot) dot.style.transform = !on ? "translateX(0)" : "translateX(-20px)"; }
    return toast(`${k.split(" ").slice(0, 4).join(" ")}: ${on ? "off" : "on"}.`); }
  if (["Today", "Tomorrow"].includes(k) && ["Ready", "Spark", "PickDay"].includes(sc)) { p.date = iso(addDays(k === "Today" ? 0 : 1)); choose(t); save(); return refresh(); }
  if (t.dataset.date) { p.date = t.dataset.date; save(); return refresh(); }
  if (t.dataset.spark !== undefined) { p.spark = t.dataset.spark === "custom" ? "custom" : +t.dataset.spark; save(); $$("[data-spark]", t.parentElement).forEach(c => c.classList.toggle("on", c === t)); if (p.spark === "custom") { const m = $("[data-b=ownmsg]", t); if (m && document.activeElement !== m) m.focus(); } return; }
  if (t.dataset.fl !== undefined) { if (t.dataset.fl !== "custom") { p.line = +t.dataset.fl; p.custom = null; } save(); $$("[data-fl]", t.parentElement).forEach(c => c.classList.toggle("on", c === t)); return; }
  if (t.dataset.act === "editline") { const fr = $(`#s-${sc} [data-b=flrow]`), on = fr && (fr.querySelector(".on") || fr.firstElementChild); if (!on) return; const span = on.querySelector("span"); span.contentEditable = "true"; span.focus(); try { getSelection().selectAllChildren(span); } catch (er) {} return toast("Type your own words, then tap Save my plan."); }
  if (t.dataset.act === "wasend") { const msg = p.spark === "custom" ? (p.sparkOwn || "").trim() : sparkList()[p.spark || 0];
    if (!msg) return toast("Write your message first, or pick a question.");
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank", "noopener"); p.sparkSent = today; save(); if (H.rate) H.rate("spark_sent", 1, S.cur);
    return toast("WhatsApp opens with your message. Pick your teen's chat. Nothing about Raise is included."); }
  if (t.dataset.tpday) { p.date = t.dataset.tpday; save(); refresh(); return toast(`${dayLabel(p.date).replace("Tonight", "Today")}, ${p.place}.${p.stage === "planned" ? " Plan updated." : ""}`); }
  if (t.dataset.tpplace) { p.place = t.dataset.tpplace; save(); return refresh(); }
  if (t.dataset.act === "watoggle") { p.waOpen = !p.waOpen; save(); return refresh(); }
  if (t.dataset.act === "tpclose") return back("MyTopics");
  if (t.dataset.act === "tpsave") { const f = $(`#s-${sc} [data-b=flrow] [contenteditable=true]`); if (f) { f.contentEditable = "false"; const v = f.textContent.replace(/^["“]|["”]$/g, "").trim(); if (v && v !== noCite(L().first_lines[p.line])) p.custom = v; }
    p.date = p.date || today; p.stage = "planned"; S.gateFor = S.cur; save(); refresh(); return toast(`Plan saved: ${dayLabel(p.date).replace("Tonight", "today")}, ${p.place}. Reminder at 7:30 pm. It waits in My topics.`); }
  if (t.dataset.act === "tptalked") return show("Debrief");
  if (t.dataset.act === "tpnot") return show("NotYet");
  if (t.dataset.act === "celopen") { const c = $("#celebrate"); if (c) c.remove(); return openTopic(t.dataset.slug); }
  if (t.dataset.act === "celclose") { const c = $("#celebrate"); if (c) c.remove(); scr("Reflection").classList.remove("celebrating"); return; }
  if (["After school", "After dinner", "On a walk", "On a phone call"].includes(k)) { p.place = k.toLowerCase(); choose(t); save(); return; }
  if (k === "Save my plan" || k === "Save and choose where to send") { const f = $(`#s-${sc} [data-b=flrow] [contenteditable=true]`) || $(`#s-${sc} [data-b=firstline][contenteditable=true]`); if (f) { f.contentEditable = "false"; const v = f.textContent.replace(/^["“]|["”]$/g, "").trim(); if (v && v !== noCite(L().first_lines[p.line])) p.custom = v; }
    p.date = p.date || today; p.stage = "planned"; S.gateFor = S.cur; save();
    if (k.startsWith("Save and")) { const q = sparkList()[p.spark || 0];
      if (q) { window.open("https://wa.me/?text=" + encodeURIComponent(q), "_blank", "noopener"); toast("WhatsApp opens with the question. Pick your teen's chat. Only the question is sent, nothing about Raise."); } }
    return show("PlanSaved"); }

  // my topics and after the talk
  if (t.dataset.day) { const has = myTopics().find(([s, q]) => q.date === t.dataset.day && q.stage === "planned"); $$("button", t.parentElement).forEach(b => b.setAttribute("style", b === t ? TPL.dayOn : TPL.dayOff)); return toast(has ? `${dayLabel(t.dataset.day)}: talk about ${(bySlug(has[0]).short || bySlug(has[0]).title).toLowerCase()}` : `${dayLabel(t.dataset.day)}: no talk planned.`); }
  if (sc === "MyTopics" && ["All", "To talk", "To finish", "Done", "Saved"].includes(k)) { S.myFilter = k; save(); return refresh(); }
  if (sc === "MyTopics") { const row = t.closest("[data-topic]"); if (row) { S.cur = row.dataset.topic; const q = P(); save();
      if (["Talk card", "Talk plan", "Plan talk"].includes(k)) return show("TalkCard"); if (k === "Continue lesson") return show("Player"); if (k === "Tell Raise") return show("Debrief"); return show("TopicDetail"); } }
  if (k === "Listen again") { goChapter(0); return show("Player"); }
  if (k === "Remove from My topics") { p.stage = "removed"; save(); toast("Removed. You can find it again on Home."); return show("MyTopics"); }
  if (sc === "Debrief" && t.tagName === "BUTTON" && !["Close", "See my reflection", "We have not talked yet"].includes(k)) { choose(t); const grp = t.parentElement.previousElementSibling ? t.parentElement.previousElementSibling.textContent : ""; const key = grp.includes("long") ? "len" : grp.includes("respond") ? "resp" : "feel"; p.debrief[key] = k; save(); return; }
  if (k === "See my reflection") { p.debrief.said = ($("#s-Debrief textarea").value || "").trim(); p.stage = "done"; p.talked = today; p.tries = (p.tries || 0) + 1;
    p.log = p.log || []; p.log.push({ date: today, len: p.debrief.len || null, resp: p.debrief.resp || null, feel: p.debrief.feel || null, said: p.debrief.said || "" });
    delete p.debrief.useful; delete p.debrief.pushed; $("#s-Debrief textarea").value = ""; save(); return show("Reflection"); }
  if (t.dataset.act === "secondtry") { p.stage = "heard"; p.line = (p.line + 1) % 3; if (L().second_try) p.custom = L().second_try.new_way_in; p.date = iso(addDays(2)); save(); toast("A second try, two days from now. You can change the day."); return show("TalkCard"); }
  if (sc === "Reflection" && ["Yes", "No"].includes(k)) { choose(t); return toast("Thank you. This shapes your next reflection."); }
  if (sc === "Reflection" && k === "Open") { const c = t.closest("[data-topic]"); if (c) return openTopic(c.dataset.topic); return show("Home"); }
  if (sc === "NotYet" && ["Later today", "Tomorrow", "Pick a day"].includes(k)) { choose(t); if (k === "Pick a day") return show("PickDay"); p.date = iso(addDays(k === "Tomorrow" ? 1 : 0)); save(); return; }
  if (k === "Move my plan to tomorrow") { p.date = p.date && p.date > today ? p.date : iso(addDays(1)); p.stage = "planned"; save(); toast(`Moved to ${dayLabel(p.date).toLowerCase()}.`); return show("MyTopics"); }
  if (k === "Drop this plan") { p.stage = "heard"; p.date = null; save(); toast("Plan dropped. The lesson stays in My topics."); return show("MyTopics"); }
  if (sc === "Closing" && ["Yes", "No"].includes(k)) return toast("Thank you. This helps Raise improve the lesson.");
  if (k === "Share this topic with another parent") { const x = T(), url = location.origin + location.pathname;
    const msg = `I found this useful for talking with my teenager:\n\n*${x.title}*\nA free ${x.duration_min}-minute lesson, checked against research, that gives you the first sentence to start the talk. Available in English, తెలుగు and हिन्दी.${ready(x) ? `\n\nTry this line: "${LX(x).first_lines[0]}"` : ""}\n\n${url}`;
    window.open("https://wa.me/?text=" + encodeURIComponent(msg), "_blank", "noopener"); if (H.rate) H.rate("share_topic", 1, x.slug); return toast("WhatsApp opens with the lesson, a first line to try, and the link. Choose the parent to send it to."); }

  // me
  if (k === "Call") { const n = (t.closest("div").parentElement.textContent.match(/1098|14416|1930/) || [""])[0]; return toast(`On a phone this calls ${n}. Raise does not record the call.`); }
  if (sc === "Language" && t.tagName === "BUTTON") { const lg = /Telugu|తెలుగు/.test(k) ? "te" : /Hindi|हिन्दी/.test(k) ? "hi" : /^English/.test(k) ? "en" : null;
    if (lg) { stop(); S.lang = lg; save(); refresh(); const n = TOPICS.filter(x => ready(x) && (lg === "en" || hasLang(x, lg))).length;
      return toast(lg === "en" ? "Lessons in English." : `Lessons in ${LANG_NAME[lg]} (beta): ${n} ready. Others stay in English until their ${LANG_NAME[lg]} version is checked. Screens stay in English for now.`); } }
  if (["Standard", "Large", "Extra large"].includes(k)) { S.textSize = k; choose(t); save(); return toast(`Text size: ${k}. Lesson text uses it.`); }
  if (sc === "Lens" && t.tagName === "BUTTON" && !k.startsWith("Not listed") && k !== "Close") { choose(t); S.lens = k; save(); refresh(); return toast(k === "None" ? "No thoughts added." : `Saved. A passage from ${k} appears once it is checked against the original.`); }
  if (k === "Not listed? Ask Raise to add someone") return toast("Request noted. A name is added only after its passages are checked.");
  if (k === "Delete this note") { const i = +(t.dataset.note || 0); S.notes.splice(i, 1); save(); toast("Note deleted."); return refresh(); }
  if (sc === "AddNote" && ["About me", "About my child"].includes(k)) { choose(t); S.noteAbout = k; save(); return; }
  if (k === "Save note") { const v = ($("#s-AddNote textarea").value || "").trim(); if (!v) return toast("Type a note first, or tap Close."); S.notes.unshift({ about: S.noteAbout, text: v, date: today }); $("#s-AddNote textarea").value = ""; save(); toast("Note saved on this phone."); return show("FamilyNote"); }
  if (k.startsWith("Google") && ["Account", "Delete"].includes(sc)) return H.google ? H.google() : toast("Sign-in is not connected yet. Your data stays on this phone.");
  if (k.startsWith("Phone number")) return toast("Adding a phone number needs sign-in, which is not connected yet.");
  if (k === "Delete everything" && sc === "Delete") { const i = $("#s-Delete input"); if (!i || i.value.trim().toUpperCase() !== "DELETE") return toast("Type DELETE to confirm."); try { localStorage.removeItem("raise-v7b"); } catch (er) {} S = fresh(); i.value = ""; hist.length = 0; toast("Everything on this phone is deleted."); return show("Main"); }
  if (k === "Report a problem with a lesson") return toast("Thank you. The lesson is held and checked again.");
  if (k.startsWith("Tell me when")) return toast("We will tell you when Supporter is ready.");
  if (sc === "Discreet" && k.startsWith("Ask for a PIN")) return toast("A PIN needs the installed app. It is not available in this preview.");
  if (sc === "Discreet" && k.startsWith("Neutral reminder")) return toast("Reminders already show as \"Evening walk\".");
  if (sc === "Admin") { choose(t); const f = DATA.factory; return toast(k === "Numbers" ? `${f.published} published · ${f.queued} being written · ${f.candidates} topics proposed · ${f.sources} papers read` : k === "Boundary tests" ? "Boundary tests have not been run yet." : k === "This week" ? "Showing this week's factory results." : "Admin actions are not connected in this build."); }

  const to = (GO[sc] || {})[k]; if (to) { stop(); return show(to); }
  if (choose(t)) return;
  if (t.tagName === "A" && t.getAttribute("target") === "_blank") return;
  toast("This needs the hosted app.");
}

/* ---------------- voice typing: the microphone next to a text box, in the lesson language ---------------- */
let rec = null;
function dictate(m){
  const field = m.parentElement.querySelector("input, textarea"); if (!field) return;
  if (rec) { rec.stop(); return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return toast("Voice typing is not available in this browser. Tap the microphone key on your phone's keyboard instead.");
  const base = field.value ? field.value.trim() + " " : "";
  rec = new SR(); rec.lang = LANG_CODE[S.lang || "en"]; rec.interimResults = true; rec.continuous = false;
  m.style.background = "#FDEBDD"; m.style.borderRadius = "22px"; toast(`Listening in ${LANG_NAME[S.lang || "en"]}… speak now. Tap the microphone again to stop.`);
  rec.onresult = ev => { field.value = base + [...ev.results].map(r => r[0].transcript).join(""); field.dispatchEvent(new Event("input", { bubbles: true })); };
  rec.onerror = ev => toast(ev.error === "not-allowed" || ev.error === "service-not-allowed" ? "Allow the microphone for this site in your browser settings, then try again." : ev.error === "no-speech" ? "Didn't hear anything. Tap the microphone and speak." : "Could not hear that. Please try again or type.");
  rec.onend = () => { rec = null; m.style.background = ""; const v = field.value.trim();
    if (v && cur === "Doubt" && field.closest("#s-Doubt")) { answer(v); field.value = ""; } };
  try { rec.start(); } catch (er) { rec = null; m.style.background = ""; toast("Could not start the microphone. Please type instead."); }
}

document.addEventListener("click", e => {
  const mic = e.target.closest("#phone [data-mic]"); if (mic) { e.preventDefault(); return dictate(mic); }
  const lm = e.target.closest("#phone [data-act=langmenu]"); if (lm) { e.preventDefault(); return $("#langmenu") ? closeLangMenu() : openLangMenu(lm); }
  const li = e.target.closest("#langmenu [data-lang]"); if (li) { e.preventDefault(); closeLangMenu(); return handle(li); }
  if ($("#langmenu") && !e.target.closest("#langmenu")) { closeLangMenu(); e.preventDefault(); return; }
  const j = e.target.closest("[data-jump]"); if (j) { stop(); hist.length = 0; return show(j.dataset.jump); }
  const t = e.target.closest("#phone .screen button, #phone .screen a, #phone [data-overlay], #phone [data-topic], #phone [data-spark], #phone [data-fl], #celebrate button"); if (!t) return;
  if (t.tagName === "A" && t.getAttribute("target") === "_blank") return;
  e.preventDefault(); handle(t);
});
document.addEventListener("keydown", e => {
  if (e.key !== "Enter" || e.target.tagName !== "INPUT") return;
  const q = e.target.value.trim(); if (!q) return;
  if (cur === "Doubt" || cur === "Boundary") { if (cur === "Boundary") show("Doubt"); answer(q); e.target.value = ""; return; }
  if (["Search", "SearchBoundary"].includes(cur) && BOUNDARY.test(q)) { $("#s-SearchBoundary input").value = q; return show("SearchBoundary"); }
  if (cur === "Phone") { const b = $$("#s-Phone button").find(x => label(x) === "Send code"); if (!b.disabled) show("Otp"); }
});
document.addEventListener("input", e => {
  if (e.target.closest && e.target.closest("[data-b=ownmsg]")) { P().sparkOwn = e.target.textContent; save(); return; }
  if (cur === "Search" && e.target.matches("#s-Search input")) { if (BOUNDARY.test(e.target.value)) { $("#s-SearchBoundary input").value = e.target.value; return show("SearchBoundary"); } return refresh(); }
  if (cur === "Phone" && e.target.type === "tel") { const ok = e.target.value.replace(/\D/g, "").length === 10; const b = $$("#s-Phone button").find(x => label(x) === "Send code"); b.disabled = !ok; b.style.background = ok ? "#4A2C5A" : "#D8CFDD"; const err = startsText(scr("Phone"), "One digit is missing"); if (err) err.style.visibility = ok ? "hidden" : "visible"; }
  if (cur === "Delete" && e.target.matches("#s-Delete input")) { const b = $$("#s-Delete button").find(x => label(x) === "Delete everything"); const ok = e.target.value.trim().toUpperCase() === "DELETE"; b.disabled = !ok; b.style.opacity = ok ? "1" : ""; }
  if (cur === "Otp" && e.target.tagName === "INPUT" && e.target.value.replace(/\D/g, "").length >= 6) show("Q1");
});
document.addEventListener("click", e => { const b = e.target.closest("#s-Phone button"); if (b && label(b) === "Send code" && !b.disabled) show("Otp"); });
document.addEventListener("focusin", e => { if (e.target.matches("#s-Home input, #s-Offline input")) { show("Search"); setTimeout(() => $("#s-Search input").focus(), 0); } });
addEventListener("offline", () => { if (cur === "Home") show("Offline"); });
addEventListener("online", () => { if (cur === "Offline") show("Home"); });

/* ---------------- one-time upgrades to the v7 screens (tester feedback, 15 Nov) ---------------- */
function upgrade(){
  // 1. microphones beside text boxes become real buttons
  ["Doubt", "Boundary", "Debrief", "AddNote"].forEach(id => $$("input, textarea", scr(id)).forEach(f => { const m = f.nextElementSibling;
    if (m && m.tagName === "SPAN" && m.querySelector("svg")) { m.dataset.mic = "1"; m.setAttribute("role", "button"); m.setAttribute("aria-label", "Speak instead of typing"); m.setAttribute("tabindex", "0"); m.style.cursor = "pointer"; } }));
  // 2. Save for later shows its state
  $$("button", scr("Preview")).filter(b => label(b) === "Save for later").forEach(b => b.dataset.act = "savelater");
  // 3. one small language button (opens a short list): Home next to Help, the lesson top bar, and the first screen
  ["Home", "Offline", "Gate", "Preview"].forEach(id => { const sc = scr(id); if (!sc) return; const help = $$("button", sc).find(b => label(b) === "Help"); if (!help || help.parentElement.dataset.langwrap) return;
    const wrap = document.createElement("div"); wrap.dataset.langwrap = "1"; wrap.setAttribute("style", "display:flex;align-items:center;gap:2px"); help.before(wrap); wrap.append(langBtn("col"), help); });
  ["Player", "Read", "Parts", "Doubt", "Boundary", "Ready", "Spark", "PickDay", "PlanSaved"].forEach(id => { const sc = scr(id), mn = sc && $("[aria-label=Minimise]", sc); if (!mn) return;
    const spacer = [...mn.parentElement.children].find(k => k.tagName === "DIV" && /width:\s*36px/.test(k.getAttribute("style") || "") && !k.children.length); const b = langBtn("pill"); if (spacer) spacer.replaceWith(b); else mn.parentElement.append(b); });
  const mainLang = scr("Main") && $$("button", scr("Main")).find(b => label(b) === "English"); if (mainLang) { mainLang.dataset.act = "langmenu"; mainLang.dataset.langlabel = "full"; }
  const gfLang = scr("GoogleFail") && $$("button", scr("GoogleFail")).find(b => label(b) === "English"); if (gfLang) { gfLang.dataset.act = "langmenu"; gfLang.dataset.langlabel = "full"; }
  // 4. "Was this useful?" and "Did you feel pushed?" become 1 to 5 scales that can be cleared
  [["Reflection", ["useful", "pushed"]], ["Closing", ["useful"]]].forEach(([id, keys]) => { const sc = scr(id); if (!sc) return; let i = 0;
    $$("button", sc).filter(b => label(b) === "Yes" && b.nextElementSibling && label(b.nextElementSibling) === "No").forEach(y => { const key = keys[i++]; if (!key) return; const box = y.parentElement;
      box.setAttribute("style", (box.getAttribute("style") || "") + ";display:flex;gap:6px;flex-wrap:nowrap");
      box.innerHTML = [1, 2, 3, 4, 5].map(v => `<button data-rate="${key}" data-n="${v}" aria-label="${v} of 5" style="${RT_OFF}">${v}</button>`).join("");
      const row = box.parentElement; const cap = document.createElement("div"); cap.setAttribute("style", "font-size:12.5px;color:#6B6375;margin:-2px 0 8px;text-align:right");
      cap.textContent = "1 = not at all · 5 = very much · tap again to clear"; row.after(cap); }); });
  // 5. the bottom menu stays on every main screen
  const NO_NAV = ["Main", "GoogleFail", "Phone", "Otp", "Q1", "Q2", "Q3", "Player", "Read", "Parts", "Doubt", "Boundary", "Ready", "Spark", "PickDay", "PlanSaved", "Admin"];
  const TAB = { TalkCard: "MyTopics", Debrief: "MyTopics", Reflection: "MyTopics", TopicDetail: "MyTopics", NotYet: "MyTopics", TopicsEmpty: "MyTopics",
    FamilyNote: "Me", AddNote: "Me", Stores: "Me", Checked: "Me", Account: "Me", Plan: "Me", Delete: "Me", Help: "Me" };
  const navOf = id => { const s = scr(id); return s && $("nav", s); };
  $$(".screen").forEach(sc => { const id = sc.id.slice(2); if (NO_NAV.includes(id) || $("nav", sc)) return; const src = navOf(TAB[id] || "Home") || navOf("Home"); if (!src) return;
    // goes under any sheet or dim layer on the screen, so sheets still cover it
    const root = sc.firstElementChild, firstPinned = [...root.children].find(k => /position:\s*(absolute|fixed)/.test(k.getAttribute("style") || ""));
    root.insertBefore(src.cloneNode(true), firstPinned || null); sc.dataset.navAdded = "1"; });
  // reflection: one scale caption, and a heading so it is clear the ratings are about this reflection
  const rfl = scr("Reflection"), rt0 = rfl && $("[data-rate]", rfl); if (rt0) { const caps = $$("div", rfl).filter(d => /^1 = not at all/.test(d.textContent)); caps.slice(0, -1).forEach(c => c.remove());
    let blk = rt0; while (blk.parentElement && !blk.parentElement.contains($$("div", rfl).find(e => !e.children.length && e.textContent.trim() === "Next for you"))) blk = blk.parentElement;
    const h = document.createElement("div"); h.className = "sec-h"; h.textContent = "About this reflection"; blk.before(h); }
  // 7. first lines: three to swipe between
  ["Ready", "Spark"].forEach(id => { const sc = scr(id), f = sc && $("[data-b=firstline]", sc); if (!f) return; const box = f.parentElement; box.style.display = "none";
    const row = document.createElement("div"); row.className = "fl-row"; row.dataset.b = "flrow"; box.after(row);
    const tools = document.createElement("div"); tools.setAttribute("style", "flex-shrink:0;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#6B6375;margin:-6px 2px 2px");
    tools.innerHTML = `<span data-b="flhint">Swipe to see all 3 lines</span><button data-act="editline" style="border:none;background:none;font:700 14px var(--font);color:#4A2C5A;cursor:pointer;height:36px;display:flex;align-items:center;gap:5px">${ic("pen", 15)}Use my own words</button>`; row.after(tools);
    $$("button", sc).filter(b => label(b) === "See 2 other lines").forEach(b => b.style.display = "none"); });
  // 8. the WhatsApp warm-up is its own green card
  ["Ready", "Spark"].forEach(id => { const sc = scr(id), sw = sc && $$("button[role=switch]", sc).find(b => label(b).startsWith("Send a curiosity question")); if (!sw) return;
    sw.classList.add("wa-row"); sw.firstElementChild.innerHTML = WA_ICON; const sp = sw.children[1].children; sp[0].textContent = "Warm up on WhatsApp first"; sp[1].textContent = "Send your teen a light question before you talk"; });
  const spk = scr("Spark"), spx = spk && $("[data-b=sparks]", spk); if (spx) { const card = document.createElement("div"); card.className = "wa-card"; spx.before(card);
    card.innerHTML = `<div style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#14743A;margin:0 2px 6px">${WA_ICON}Pick a question, or write your own</div>`; card.append(spx);
    const send = document.createElement("button"); send.className = "wa-btn"; send.dataset.act = "wasend"; send.innerHTML = `${WA_ICON.replace(/#1FA855/g, "#FFFFFF")}Send on WhatsApp`; card.append(send);
    const sv = $$("button", spk).find(b => label(b) === "Save and choose where to send"); if (sv) sv.textContent = "Save my plan"; }
  // 9. the talk card's line: a readable size, shown as a line to say
  const tcl = scr("TalkCard") && $("[data-b=firstline]", scr("TalkCard")); if (tcl) { tcl.classList.add("say"); tcl.style.fontSize = "19px"; tcl.style.lineHeight = "1.38"; tcl.style.padding = "12px 16px"; tcl.style.marginBottom = "12px";
    const sw2 = startsText(scr("TalkCard"), "Start with"); if (sw2 && !sw2.children.length) sw2.textContent = "💬 Start with"; }
  // 10. lines to say in the lesson look like chat bubbles
  ["Player", "Read", "Parts", "Doubt", "Boundary", "Ready", "Spark", "PickDay", "PlanSaved"].forEach(id => { const sc = scr(id); if (!sc) return; $$("[data-b=line]", sc).forEach(l => { const box = l.closest("div[style*='border-radius']"); if (box) box.classList.add("say"); const lab = l.previousElementSibling; if (lab && lab.textContent.trim() === "You could say") { lab.innerHTML = `${ic("say", 15)}You could say`; lab.classList.add("lab-ic"); } }); });
  // 12. ONE talk plan, opened from everywhere: what to say, when, WhatsApp warm-up, tips, and the outcome
  const tcS = scr("TalkCard"), tfl = tcS && $("[data-b=firstline]", tcS); if (tfl) { const col = tfl.parentElement; col.style.paddingTop = "20px";
    const hd = document.createElement("div"); hd.setAttribute("style", "display:flex;align-items:center;justify-content:space-between;gap:8px");
    hd.innerHTML = `<div style="min-width:0"><h1 style="margin:0;font-size:22px;font-weight:700">Your talk plan</h1><div data-b="tptopic" style="font-size:14px;color:#6B6375;margin-top:2px"></div></div><button aria-label="Close" data-act="tpclose" style="border:none;background:#F3EEE8;width:44px;height:44px;border-radius:22px;cursor:pointer;font-size:24px;line-height:1;color:#2A2233;flex:none">×</button>`;
    col.prepend(hd); $("[data-b=when]", tcS).style.display = "none";
    tfl.style.display = "none"; tfl.classList.remove("say"); const lab = tfl.previousElementSibling; if (lab) { lab.innerHTML = `${ic("say", 17)}What to say`; lab.classList.add("lab-ic"); lab.style.marginTop = "14px"; }
    const row = document.createElement("div"); row.className = "fl-row"; row.dataset.b = "flrow"; tfl.after(row);
    const tools = document.createElement("div"); tools.setAttribute("style", "flex-shrink:0;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#6B6375;margin:-6px 2px 0");
    tools.innerHTML = `<span>Swipe to see all 3 lines</span><button data-act="editline" style="border:none;background:none;font:700 14px var(--font);color:#4A2C5A;cursor:pointer;height:36px;display:flex;align-items:center;gap:5px">${ic("pen", 15)}Use my own words</button>`; row.after(tools);
    const when = document.createElement("div"); when.setAttribute("style", "flex-shrink:0");
    when.innerHTML = `<div class="lab-ic" style="font-size:14px;font-weight:700;color:#4A2C5A;margin-top:8px">${ic("cal", 17)}When</div><div data-b="tpdays" class="fl-row" style="gap:8px;padding:6px 2px 4px"></div><div data-b="tpplaces" class="fl-row" style="gap:8px;padding:2px 2px 4px"></div><div data-b="tpremind" style="font-size:13.5px;color:#6B6375;margin:0 2px"></div>`;
    tools.after(when);
    const wa = document.createElement("div"); wa.setAttribute("style", "flex-shrink:0;margin-top:12px");
    wa.innerHTML = `<button data-act="watoggle" aria-label="Warm up on WhatsApp first" class="glass wa-toggle" style="font-family:inherit;cursor:pointer;width:100%;display:flex;align-items:center;gap:10px;text-align:left;border-radius:16px;padding:10px 12px;color:#2A2233">${WA_ICON}<span style="flex:1"><span style="display:block;font-size:15.5px;font-weight:700">Warm up on WhatsApp first</span><span style="display:block;font-size:13px;color:#3D6B4E">Send your teen a light question before you talk</span></span><span data-b="wachev" style="color:#1E7A4A;display:flex">${ic("chev", 20)}</span></button>
      <div data-b="wabox" class="wa-card" style="display:none"><div data-b="sparks"></div><button class="wa-btn" data-act="wasend">${WA_ICON.replace(/#1FA855/g, "#FFFFFF")}Send on WhatsApp</button></div>`;
    when.after(wa);
    const keep = startsText(tcS, "Keep in mind"), keepBox = keep && keep.parentElement, whyBox = $("[data-b=tcwhyhead]", tcS) && $("[data-b=tcwhyhead]", tcS).parentElement;
    const det = document.createElement("details"); det.className = "glass"; det.setAttribute("style", "flex-shrink:0;margin-top:12px;border-radius:18px;padding:0 14px");
    det.innerHTML = `<summary style="cursor:pointer;font-size:15px;font-weight:700;color:#4A2C5A;min-height:50px;display:flex;align-items:center;gap:8px">${ic("bulb", 18)}<span style="flex:1">Tips, and what to do if it goes wrong</span>${ic("chev", 20)}</summary>`;
    wa.after(det); [keepBox, whyBox].forEach(b => { if (b) { b.style.marginTop = "0"; b.style.marginBottom = "12px"; det.append(b); } });
    const talked = $$("button", tcS).find(b => label(b) === "We talked"); if (talked) { const sv = document.createElement("button"); sv.dataset.act = "tpsave"; sv.textContent = "Save my plan"; sv.setAttribute("style", talked.getAttribute("style")); talked.before(sv); talked.dataset.act = "tptalked"; }
    const nt = $$("button", tcS).find(b => label(b) === "Not today"); if (nt) nt.dataset.act = "tpnot";
    if (talked) talked.parentElement.style.marginTop = "16px"; }
  // "Talk card" is now "Talk plan" everywhere
  $$(".screen button, .screen a").forEach(b => { if (label(b) === "Open talk card") { const leaf = $$("*", b).filter(e => !e.children.length && e.textContent.trim() === "Open talk card").pop(); (leaf || b).textContent = "Open talk plan"; } });
  // 13. lesson toolbar: three equal tiles (Chapters, Ask a doubt, Next), apart from "I am ready to talk"
  ["Player", "Read"].forEach(id => { const sc = scr(id), chb = sc && $$("button", sc).find(b => label(b) === "Chapters"); if (!chb) return; const bar = chb.parentElement;
    let nx = $$("button", bar).find(b => label(b) === "Next chapter"); if (!nx) { nx = document.createElement("button"); nx.setAttribute("style", chb.getAttribute("style")); bar.append(nx); }
    const ask = $$("button", bar).find(b => label(b) === "Ask a doubt");
    const pv = document.createElement("button"); pv.setAttribute("style", chb.getAttribute("style")); bar.prepend(pv);
    [[pv, "prev", "Previous chapter", "Previous", "tb-prev"], [chb, "list", "Chapters", "Chapters", ""], [ask, "ask", "Ask a doubt", "Ask a doubt", "tb-ask"], [nx, "next", "Next chapter", "Next", "tb-next"]].forEach(([b, i, aria, txt, cls]) => { if (!b) return; b.setAttribute("aria-label", aria); b.innerHTML = `${ic(i, 22)}<span>${txt}</span>`; if (cls) b.classList.add(cls); bar.append(b); });
    bar.classList.add("tb", "glass");
    const rd = $$("button", sc).find(b => label(b) === "I am ready to talk"); if (rd) rd.classList.add("ready-gap");
    $$("[data-b=chlabel]", sc).forEach(e => e.classList.add("ch-chip")); });
  // 14. topic page: every action looks like a button
  const tdS = scr("TopicDetail"); if (tdS) { const B = k => $$("button", tdS).find(b => label(b) === k);
    [["Listen again", "play", "btn-o"], ["Change plan", "pen", "btn-o"], ["We talked", "check", "btn-f"], ["Open talk plan", "plan", "btn-f"], ["Remove from My topics", "trash", "btn-o btn-danger btn-center"]].forEach(([k, i, c]) => { const b = B(k); if (!b) return; b.setAttribute("aria-label", k); b.innerHTML = `${ic(i, 17)}${k}`; c.split(" ").forEach(x => b.classList.add(x)); }); }
  // 15. reflection: bigger section headings; "Next for you" marked so it is never shown twice
  const rfS = scr("Reflection"); if (rfS) { const nxl = $$("div", rfS).find(e => !e.children.length && e.textContent.trim() === "Next for you");
    if (nxl) { nxl.classList.add("sec-h"); nxl.dataset.b = "rfnextblk"; const card = $("[data-b=rfnext]", rfS); const ce = card && (card.closest("div[style*='border-radius']") || card.parentElement); if (ce) { const wrap = document.createElement("div"); wrap.dataset.b = "rfnextblk"; ce.before(wrap); wrap.append(ce); }
      const op = $$("button", rfS).find(b => label(b) === "Open"); if (op && op.parentElement) op.parentElement.dataset.b = "rfnextblk"; } }
  // 16. share with another parent: clearly a WhatsApp share
  $$("button", scr("Closing")).filter(b => label(b) === "Share this topic with another parent").forEach(b => { b.setAttribute("aria-label", "Share this topic with another parent"); b.innerHTML = `${WA_ICON}<span>Share with a parent on WhatsApp</span>`; b.classList.add("btn-o", "wa-share"); });
  // 11. after "We talked", there is no "we have not talked yet"
  const dbq = scr("Debrief") && $$("button", scr("Debrief")).find(b => label(b) === "We have not talked yet"); if (dbq) dbq.style.display = "none";
  // 6. say what discreet mode is for
  const ds = scr("Discreet"), dl = ds && startsText(ds, "For a shared phone"); if (dl) dl.textContent = "For shared phones. When it is on, Raise shows only general categories like \"Feelings\" instead of lesson titles and pictures, and reminders use your own neutral words like \"Evening walk\". Anyone glancing at your phone, including your teen, will not see what you are preparing for.";
}

capture();
upgrade();
makeScrollable();
["Search", "SearchBoundary", "Doubt", "Boundary"].forEach(id => $$("input", scr(id)).forEach(i => { i.value = ""; i.setAttribute("value", ""); }));
const how = startsText(scr("FamilyNote"), "Suggests gentler openings"); if (how) how.textContent = "Raise uses your notes to suggest gentler first lines. In this preview they stay on this phone only. Raise never labels your child.";
const how2 = startsText(scr("AddNote"), "Suggests gentler openings"); if (how2) how2.textContent = how.textContent;
const start = location.hash.slice(1);
show(scr(start) ? start : (Object.keys(S.t).length ? "Home" : "Main"), false);

window.RAISE = { get S(){ return S; }, set S(v){ S = v; }, save, show, toast, refresh, fresh, get cur(){ return cur; } };
if (H.ready) H.ready();
