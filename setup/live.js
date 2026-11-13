/* Raise · live layer for the hosted app.
   Connects the v7 screens to Supabase: live lessons and covers, Google sign-in, invisible (anonymous) sign-in,
   saving each parent's progress, simple analytics events, and AI answers to doubts.
   If anything here fails, the app still works with the lessons built into the page. */
(function () {
  const SB_URL = "https://ekgcbnffpcsnfkefacrj.supabase.co";
  const SB_KEY = "sb_publishable_x-U67Q0oAz6PHecvGkUsZA_ngBGMpxB"; // publishable key: safe in a web page; row-level security protects the data
  const HERE = location.origin + location.pathname;
  const qs = new URLSearchParams(location.search), hs = new URLSearchParams(location.hash.replace(/^#/, ""));
  const oauthError = qs.get("error_description") || hs.get("error_description") || qs.get("error");
  const returningFromGoogle = qs.has("code");

  let sb = null, session = null;
  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
  const run = () => { const code = document.getElementById("raise-app").textContent; const s = document.createElement("script"); s.textContent = code; document.body.appendChild(s); };


  /* ---------- live feed → the shape the screens use ---------- */
  const strip = t => String(t || "").replace(/\s*\[[0-9,\s–-]+\]/g, "");
  const arr = v => Array.isArray(v) ? v : [];
  const pick = (...v) => v.find(x => x !== undefined && x !== null && x !== "");
  function toTopic(item, baked) {
    const t = item.t || {}, l = item.lesson, R = (l && l.raw) || {};
    const old = baked.find(b => b.slug === t.slug) || {};
    const out = { slug: t.slug, title: t.title, category: pick(t.category, old.category, "For parents"), pastel: pick(t.pastel, old.pastel, "peach"),
      status: t.status, family_need: pick(t.family_need, old.family_need), school_coverage: pick(t.school_coverage, old.school_coverage),
      school_evidence: pick(t.school_evidence, old.school_evidence), why_parent: pick(t.why_parent, t.why, old.why_parent), sensitive: !!t.sensitive };
    const cu = t.cover_url && /^https?:/.test(t.cover_url) ? t.cover_url : null;
    if (cu) { out.cover = cu; out.cover_alt = t.cover_alt || t.title; } else if (old.cover) { out.cover = old.cover; out.cover_alt = old.cover_alt; }
    if (!l) { if (old.lesson && t.status === "published") Object.assign(out, { lesson: old.lesson, duration_min: old.duration_min, summary: old.summary, why_now: old.why_now, short: old.short }); return out; }
    const ls = l.listen_script || {};
    let chs = arr(ls.chapters).length ? ls.chapters : arr(ls).length ? ls : arr(R.chapters);
    chs = chs.map((c, i) => { const text = strip(pick(c.text, c.body, c.script, "")); return { n: pick(c.n, c.number, i), title: pick(c.title, c.heading, `Chapter ${i + 1}`), text, secs: Math.max(20, Math.round(text.split(/\s+/).length / 2.4)) }; });
    if (!chs.length) { if (old.lesson) out.lesson = old.lesson; return out; }
    const all = chs.map(c => c.text).join(" "), words = all.split(/\s+/).length;
    const rawText = JSON.stringify(ls) + JSON.stringify(R.chapters || "");
    const cited = new Set((rawText.match(/\[[0-9,\s]+\]/g) || []).flatMap(m => m.match(/\d+/g).map(Number)));
    const tc = pick(l.talk_card, R.talk_card) || {};
    const srcs = arr(item.sources).map(s => ({ n: s.n, title: s.title, url: pick(s.url, s.doi && `https://doi.org/${s.doi}`), publisher: pick(s.publisher, s.journal, s.source), year: s.year, kind: pick(s.kind, s.type, "paper") }))
      .filter(s => s.n != null && (!cited.size || cited.has(Number(s.n)))).sort((a, b) => a.n - b.n);
    const audio = arr(item.audio).map(a => { const m = String(a.file_name || "").match(/-c(\d+)-p(\d+)/); return { chapter: Number(pick(a.chapter, m && m[1], 0)), part: Number(pick(a.part, m && m[2], 1)), url: pick(a.url, a.public_url, a.file_name && `${SB_URL}/storage/v1/object/public/audio/${a.file_name}`), seconds: Number(pick(a.seconds, a.duration, Math.round((a.words || 120) / 2.5))) }; })
      .filter(a => a.url).sort((a, b) => a.chapter - b.chapter || a.part - b.part);
    out.lesson = { chapters: chs, first_lines: arr(pick(l.first_lines, R.first_lines)), say: pick(tc.ask, tc.open, ""), talk_card: tc, sparks: arr(pick(l.sparks, R.sparks)),
      second_try: pick(l.second_try, R.second_try), sources: srcs.length ? srcs : (old.lesson && old.lesson.sources) || [],
      audio: audio.length ? audio : (old.lesson && old.lesson.audio) || [] };
    const tr = item.translations || {}; out.lesson.tr = {};
    Object.keys(tr).forEach(lg => { const x = tr[lg] || {}; if (arr(x.chapters).length === chs.length) out.lesson.tr[lg] = { title: x.title, chapters: arr(x.chapters).map(c => ({ title: c.title, text: strip(c.text) })), first_lines: arr(x.first_lines), talk_card: x.talk_card || {}, second_try: x.second_try || null, sparks: arr(x.sparks) }; });
    out.duration_min = pick(R.duration_min, Math.max(8, Math.round(words / 150)));
    out.summary = pick(R.summary, t.summary, old.summary, ""); out.why_now = pick(R.why_now, t.why_now, old.why_now, "");
    out.short = pick(t.short, R.short, old.short, String(t.title || "").replace(/^When your teen (is |feels |shows signs of |faces )?/i, "").replace(/^./, c => c.toUpperCase()));
    return out;
  }
  function fromFeed(feed, baked) {
    const topics = arr(feed.topics).map(i => { try { return toTopic(i, baked.topics); } catch (e) { return null; } }).filter(t => t && t.slug && t.title);
    if (!topics.some(t => t.lesson)) return null;            // never show an app with nothing to listen to
    baked.topics.forEach(b => { if (b.lesson && !topics.find(t => t.slug === b.slug)) topics.push(b); });
    return { topics, factory: Object.assign({}, baked.factory, feed.factory || {}) };
  }

  /* ---------- analytics ---------- */
  const queue = []; let flushT = null, lastView = "";
  function track(name, props) {
    if (!sb || !session) return;
    queue.push({ name, screen: props && props.screen || null, topic: props && props.topic || null, props: props || {} });
    clearTimeout(flushT); flushT = setTimeout(flush, 1200);
  }
  async function flush() {
    if (!queue.length || !sb || !session) return;
    const rows = queue.splice(0).map(r => ({ ...r, user_id: session.user.id, anon: !!session.user.is_anonymous }));
    try { await sb.from("app_events").insert(rows); } catch (e) {}
  }
  addEventListener("pagehide", flush);

  /* ---------- saving progress ---------- */
  let saveT = null, lastStages = {};
  function stagesOf(S) { const o = {}; Object.entries(S.t || {}).forEach(([k, v]) => o[k] = v.stage); return o; }
  function onSave(S) {
    const now = stagesOf(S);
    Object.entries(now).forEach(([slug, st]) => { if (lastStages[slug] !== st) track("stage", { topic: slug, stage: st }); });
    lastStages = now;
    if (!sb || !session) return;
    clearTimeout(saveT);
    saveT = setTimeout(async () => { try { await sb.from("app_state").upsert({ user_id: session.user.id, state: S, updated_at: new Date().toISOString() }); } catch (e) {} }, 1500);
  }

  async function signInAnon() {
    if (session) return session;
    try { const r = await sb.auth.signInAnonymously(); session = r.data && r.data.session || null; if (session) track("signed_in", { method: "anonymous" }); } catch (e) {}
    return session;
  }
  function google() {
    if (!sb) { window.RAISE && RAISE.toast("Sign-in is not available right now. Please try again."); return true; }
    try { localStorage.setItem("raise-google-pending", "1"); } catch (e) {}
    sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: HERE } });
    return true;
  }

  window.RAISE_HOOKS = {
    save: onSave,
    view(id, topic) { const key = id + "|" + topic; if (key === lastView) return; lastView = key; track("view", { screen: id, topic }); },
    user() {
      if (!session) return null; const u = session.user, m = u.user_metadata || {};
      return u.is_anonymous ? { name: "Parent", email: null } : { name: (m.full_name || m.name || "Parent").split(" ")[0], email: u.email };
    },
    google,
    click(sc, k) {
      if (["Main", "GoogleFail"].includes(sc) && ["Continue with Google", "Retry"].includes(k)) return google();
      if (sc === "Main" && k === "Continue with phone number") {
        signInAnon().then(() => { RAISE.toast("Phone sign-in comes later. You can use Raise now; your progress is saved for this phone."); RAISE.show("Q1"); });
        return true;
      }
      if (k === "Sign out" && sb) { track("signed_out"); flush(); sb.auth.signOut().finally(() => { session = null; }); return false; }
      if (sc === "Delete" && k === "Delete everything" && sb && session) {
        const i = document.querySelector("#s-Delete input");
        if (i && i.value.trim().toUpperCase() === "DELETE") {
          sb.from("app_state").delete().eq("user_id", session.user.id).then(() => sb.from("app_events").delete().eq("user_id", session.user.id)).finally(() => sb.auth.signOut());
          session = null;
        }
        return false;
      }
      if (k === "Listen" || k === "Play" || k === "Pause") track("tap", { screen: sc, label: k });
      return false;
    },
    async ask(q, t) {
      if (!sb) return null;
      track("doubt", { topic: t.slug, q: q.slice(0, 300) });
      const r = await withTimeout(sb.functions.invoke("ask-doubt", { body: { q, slug: t.slug, lang: (RAISE.S.lang || "en") } }), 20000);
      if (r.error) return null;
      return r.data;
    },
    ready() {
      if (oauthError) { history.replaceState(null, "", HERE + "#GoogleFail"); return RAISE.show("GoogleFail"); }
      let pending = false; try { pending = localStorage.getItem("raise-google-pending") === "1"; localStorage.removeItem("raise-google-pending"); } catch (e) {}
      if (returningFromGoogle || pending) history.replaceState(null, "", HERE + location.hash);
      if (session && (returningFromGoogle || pending)) {
        const S = RAISE.S; const onboarded = S.age != null || (S.concerns && S.concerns.length) || Object.keys(S.t || {}).length;
        RAISE.toast(session.user.is_anonymous ? "Welcome." : `Signed in as ${session.user.email}.`);
        return RAISE.show(onboarded ? "Home" : "Q1");
      }
      if (session && RAISE.cur === "Main") { const S = RAISE.S; RAISE.show(S.age != null || Object.keys(S.t || {}).length ? "Home" : "Q1"); }
    }
  };

  /* ---------- start ---------- */
  (async function start() {
    try {
      sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { flowType: "pkce", detectSessionInUrl: true, persistSession: true, autoRefreshToken: true } });
      const r = await withTimeout(sb.auth.getSession(), 8000); session = r.data.session;
      sb.auth.onAuthStateChange((ev, s) => { session = s; if (ev === "SIGNED_IN" && s && !s.user.is_anonymous) track("signed_in", { method: "google" }); });
      // live lessons and covers
      const cat = await withTimeout(sb.rpc("app_catalog"), 8000);
      if (cat.data && cat.data.topics) { const live = fromFeed(cat.data, window.RAISE_BAKED); if (live) window.RAISE_DATA = live; }
      // bring back saved progress when this phone has none
      if (session) {
        let local = null; try { local = localStorage.getItem("raise-v7b"); } catch (e) {}
        if (!local) {
          const st = await withTimeout(sb.from("app_state").select("state").eq("user_id", session.user.id).maybeSingle(), 6000);
          if (st.data && st.data.state) try { localStorage.setItem("raise-v7b", JSON.stringify(st.data.state)); } catch (e) {}
        }
        try { lastStages = stagesOf(JSON.parse(localStorage.getItem("raise-v7b") || "{}")); } catch (e) {}
      }
    } catch (e) { console.warn("Raise live layer:", e.message); }
    run();
    const opened = () => track("open", { live: !!window.RAISE_DATA, from: document.referrer ? "link" : "direct" });
    if (!session && sb) signInAnon().then(opened); else opened(); // every visitor is counted, even before they choose to sign in
  })();
})();
