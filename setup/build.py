"""Build the Raise app from the version 7 screens.

Each v7 board is copied as it is. The builder only:
  - swaps sample text for the real published lesson,
  - tags the elements that change while you use the app (data-b),
  - lets the read text and chapter list scroll when real text is longer than the sample.
"""
import json, re, copy
from bs4 import BeautifulSoup, NavigableString

SRC = "/home/claude/raise/canvas/project/"
D = json.load(open("/home/claude/raise/app/snapshot.json"))
canvas = json.load(open(SRC + "canvas.json"))
boards = sorted(canvas["boards"].items(), key=lambda kv: (kv[1]["x"], kv[1]["y"]))

T = D["topic"]; L = D["lesson"]; CH = L["listen_script"]
SHORT = "Phone late at night"
FIRST = L["first_lines"][0]
SAY = L["talk_card"]["ask"]
cited = sorted({int(x) for c in CH for m in re.findall(r"\[([0-9,\s]+)\]", c["text"]) for x in m.split(",")})
N_CH = len(CH)

# chapter durations from the recorded audio
secs = {}
for a in D["audio"]:
    secs[a["chapter"]] = secs.get(a["chapter"], 0) + a["seconds"]
def mmss(s): return f"{s // 60}:{s % 60:02d}"

# 1. text swaps that apply on every screen ------------------------------------
SWAP = [
    ('"I have noticed you seem tired lately. Is the phone keeping you up?"', f'"{FIRST}"'),
    ("When your teen is always on the phone", T["title"]),
    ("Always on the phone", SHORT),
    ("Chapter 3 of 8 · paused", "Chapter 1 of 9 · paused"),
    ("12 min · 8 chapters · Sources: WHO, UNICEF", f"{T['duration_min']} min · {N_CH} chapters · {len(cited)} research papers"),
    ("Know what is normal, and how to bring it up calmly.", "Why teenagers stay up on the phone, and how to talk about it calmly."),
    ("What is normal at this age", "Why teenagers stay up on the phone"),
    ("What they may ask, and what you can say", "How they may react, and what you can say"),
    (f"{SHORT} · 12 min", f"{SHORT} · {T['duration_min']} min"),
    ("Heard today · 12 min", f"Heard today · {T['duration_min']} min"),
    ("Sources checked by the Raise team. Not yet reviewed by a doctor or counsellor.",
     "Every cited sentence was checked against its paper. Not yet reviewed by a doctor or counsellor."),
    ('"I believe you. Let us find a time that works for your friends and your sleep."',
     '"I understand your friends are active then, and it\'s hard to feel left out."'),
    # How lessons are checked: say what the factory really does
    ("Health and education bodies, and open research reviews", "Published research papers, found in Europe PMC"),
    ("By a person, before a lesson is written", "A second AI must quote the paper word for word, and the quote is looked up"),
    # Doubt sheet sample answer: use the lesson's own words
    ("What if he says all his friends are online at night?", "What if he says all his friends are online at night?"),
    ('That is likely true, and worth saying so. You could say: "I believe you. Let us find a time that works for your friends and your sleep."',
     'You can calmly reply: "I understand your friends are active then, and it\'s hard to feel left out. But let\'s look at how missing sleep impacts your energy for your own day."'),
    ("From this lesson, chapter 5 · Source: UNICEF", "From this lesson, chapter 7 · How they may react"),
    ('"Because I care how you are sleeping. I am not here to take the phone."',
     '"Because your health and well-being matter deeply to me, and lack of sleep harms your ability to focus and enjoy your day."'),
    # Admin: real factory activity instead of sample rows
    ("Raise admin · not visible to parents · sample data", "Raise admin · not visible to parents · live data, 13 Nov"),
    ("[Sample] New national survey on teenage sleep", "Phone late at night · version 6"),
    ("Trusted source · changes what a parent should know", "18 cited sentences checked · 0 unsupported · 17 quotes found"),
    ("[Sample] Viral post claiming one app harms all children", "Phone late at night · version 5"),
    ("Not on trusted list · alarmist, single case, no evidence", "5 cited sentences said more than their papers"),
    ("[Sample] Updated school guidance on phone use", "Research for phone late at night"),
    ("Trusted source · fits topic: phones and screens", "30 papers from Europe PMC · 10 cited · 2 from India"),
    ("[Sample] Study of university students abroad", "Phone late at night · versions 1 and 2"),
    ("Trusted source · wrong age group", "Too short: 1,114 and 1,383 words"),
    ("[N] of 30 passed · last run [date]", "Not run yet"),
]
TOPIC_MIN = [("12 min", f"{T['duration_min']} min")]   # only inside the real topic's card

def swap_text(root):
    for s in list(root.find_all(string=True)):
        if not isinstance(s, NavigableString) or s.parent.name in ("script", "style"): continue
        v = str(s)
        for a, b in SWAP:
            if a in v: v = v.replace(a, b)
        if v != str(s): s.replace_with(v)

def text(el): return el.get_text(" ", strip=True)

def tag_player(root):
    """Tag the parts of the shared player that change per chapter."""
    for d in root.find_all("div"):
        t = text(d)
        if not d.find("div") and re.fullmatch(r"Chapter 3 of 8( · about 2 min to read)?", t): d["data-b"] = "chlabel"
        if not d.find(["div", "span"]) and t == "What your child may be going through": d["data-b"] = "chtitle"
        kids = d.find_all("div", recursive=False)
        if len(kids) == 8 and not text(d) and all(not k.contents for k in kids): d["data-b"] = "dots"
    for sp in root.find_all("span"):
        if sp.string == "1:12": sp["data-b"] = "t0"; bar = sp.parent.find_previous_sibling("div")
        if sp.string == "-0:48":
            sp["data-b"] = "t1"
            bar = sp.parent.find_previous_sibling("div")
            if bar and bar.find("div"): bar.find("div")["data-b"] = "bar"; bar["data-a"] = "seek"
    for b in root.find_all("button", attrs={"aria-label": "Pause"}): b["data-b"] = "playbtn"
    for d in root.find_all("div"):
        if text(d) == "You could say" and d.find_next_sibling("div"): d.find_next_sibling("div")["data-b"] = "line"

def build_screen(name, meta):
    soup = BeautifulSoup(open(SRC + name).read(), "html.parser")
    root = soup.find("x-dc").find("div", recursive=False)
    swap_text(root)
    sid = name.replace(".dc.html", "")
    # real topic card: its own minutes
    for a in root.find_all("a"):
        if SHORT in text(a) or T["title"] in text(a):
            a["data-real"] = "1"
            for s in a.find_all(string=True):
                if s.strip() == "12 min": s.replace_with(f"{T['duration_min']} min")
    # mini player on Home
    for d in root.find_all("div"):
        if not d.find("div") and text(d) == "Chapter 1 of 9 · paused": d["data-b"] = "mini"
    if sid in ("Player", "Read", "Parts", "Doubt", "Boundary", "Ready", "PickDay", "Spark", "PlanSaved"):
        tag_player(root)
    if sid == "Read":
        for d in root.find_all("div"):
            st = d.get("style", "")
            if "overflow: hidden; flex: 1" in st and d.find("p"):
                d["data-b"] = "readbody"
                d["style"] = st.replace("overflow: hidden; flex: 1", "overflow-y: auto; flex: 1; min-height: 0; padding-bottom: 8px")
    if sid == "Parts":
        btns = [b for b in root.find_all("button") if b.find("span") and re.fullmatch(r"\d", (b.find("span").string or ""))]
        if btns:
            btns[0].parent["data-b"] = "partslist"
            btns[0].parent["style"] = btns[0].parent.get("style", "") + "; overflow-y: auto; max-height: 470px"
    if sid in ("Ready", "PickDay", "Spark"):
        for sp in root.find_all("span"):
            if sp.string and sp.string.startswith('"') and FIRST in sp.string: sp["data-b"] = "firstline"
    if sid == "Closing":
        ul = root.find("ul")
        if ul:
            tpl = ul.find("li")
            ul.clear()
            for s in [x for x in D["sources"] if x["n"] in cited]:
                li = copy.copy(tpl); sp = li.find_all("span")
                sp[0].string = (s["publisher"] or "")[:48]
                sp[1].clear()
                a = soup.new_tag("a", href=s["url"], target="_blank", rel="noopener")
                a["style"] = "color: inherit"
                a.string = f"{s['title']} · {s['year']}"
                sp[1].append(a)
                ul.append(li)
            ul["style"] = ul.get("style", "") + "; max-height: 210px; overflow-y: auto"
    if sid in ("TalkCard",):
        for d in root.find_all("div"):
            if not d.find("div") and FIRST in text(d): d["data-b"] = "firstline"
            if not d.find("div") and text(d) == "Tonight · after dinner": d["data-b"] = "when"
        for sp in root.find_all("span"):
            if sp.string == "Tonight · after dinner": sp["data-b"] = "when"
    root["data-screen"] = sid
    return sid, meta["title"], str(root)

screens = [build_screen(n, m) for n, m in boards]

# 2. the page ----------------------------------------------------------------
import os
DATAF = "/home/claude/raise/app7/data.json"
if os.path.exists(DATAF):
    data = json.load(open(DATAF))
else:
    data = {"topics": [], "factory": {}}
# the first published lesson (from the snapshot) is always included
if not any(t["slug"] == T["slug"] for t in data["topics"]):
    data["topics"].insert(0, {**{k: T.get(k) for k in ["slug","title","category","pastel","duration_min","summary","why_now"]}, "status": "published", "short": SHORT,
        "lesson": {"chapters": [{"n": c["n"], "title": c["title"], "text": re.sub(r"\s*\[[0-9,\s]+\]", "", c["text"]), "secs": secs.get(c["n"], round(len(c["text"].split()) / 2.4))} for c in CH],
                   "first_lines": L["first_lines"], "say": SAY, "talk_card": L["talk_card"], "sparks": L.get("sparks", []), "second_try": L.get("second_try"),
                   "sources": [s for s in D["sources"] if s["n"] in cited], "audio": D["audio"]}})
# approved covers (Cloudflare FLUX, passed Gate D), shrunk to 360px and embedded
import base64
ALT = {"phone-late-night": "A bedside table with a lamp, ceramic pitcher, and folded cloth.",
       "when-your-teen-feels-overwhelmed-by-academic-stres": "A desk with a backpack, brass lamp, mug, and small paper square."}
for t in data["topics"]:
    f = f"/home/claude/raise/app7/covers/{t['slug']}.jpg"
    if os.path.exists(f):
        t["cover"] = "data:image/jpeg;base64," + base64.b64encode(open(f, "rb").read()).decode()
        t["cover_alt"] = ALT.get(t["slug"], "Lesson cover")
data["factory"].setdefault("published", sum(1 for t in data["topics"] if t.get("lesson")))
data["factory"].setdefault("queued", sum(1 for t in data["topics"] if not t.get("lesson")))
data["factory"].setdefault("candidates", 0); data["factory"].setdefault("sources", 30)

sections = "\n".join(f'<section class="screen" id="s-{sid}" aria-label="{title}" hidden>{html}</section>' for sid, title, html in screens)
index = "".join(f'<button data-jump="{sid}">{title}</button>' for sid, title, _ in screens)
app = open("/home/claude/raise/app7/app.js").read().replace("/*DATA*/null", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
page = open("/home/claude/raise/app7/shell.html").read()
page = page.replace("<!--SCREENS-->", sections).replace("<!--INDEX-->", index).replace("/*APPJS*/", app)
open("/home/claude/raise/app7/index.html", "w").write(page)
print("screens", len(screens), "topics", len(data["topics"]), "bytes", len(page))
