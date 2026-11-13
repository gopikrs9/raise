# Makes the hosted version (GitHub Pages) from the same build: same 45 screens, plus the live layer.
import re, shutil, os
import sys
SITE = "/home/claude/raise-site" + ("/" + sys.argv[1] if len(sys.argv) > 1 else "")
os.makedirs(SITE, exist_ok=True)
page = open("/home/claude/raise/app7/index.html").read()
live = open("/home/claude/raise/app7/live.js").read()
# the app code waits for the live data, so it moves into a plain-text block that live.js runs
m = re.search(r"<script>\n(.*)\n</script>\n</body>", page, re.S)
app = m.group(1)
dm = re.search(r"const DATA = window.RAISE_DATA \|\| window.RAISE_BAKED \|\| (\{.*?\});\n", app, re.S)
baked = dm.group(1)
app = app.replace(dm.group(0), "const DATA = window.RAISE_DATA || window.RAISE_BAKED;\n")
page = page[:m.start()] + (
    '<script type="text/plain" id="raise-app">\n' + app.replace("</script", "<\\/script") + "\n</script>\n"
    '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n'
    "<script>\nwindow.RAISE_BAKED = " + baked + ";\n" + live + "\n</script>\n</body>") + page[m.end():]
page = page.replace("<title>Raise App (version 7)</title>", '<title>Raise · one conversation at a time</title>\n<meta name="description" content="Raise prepares Indian parents of 14 to 18 year olds for one conversation at a time with their teenager.">\n<meta name="theme-color" content="#4A2C5A">\n<link rel="manifest" href="manifest.webmanifest">')
# on a real phone: full screen, no frame
page = page.replace("@media (max-width:760px){ #index{display:none} body{gap:0} }",
    "@media (max-width:760px){ #index{display:none} body{gap:0;background:#FFF8F0} #phone{border-radius:0;box-shadow:none} }")
page = page.replace('<a href="privacy.html"', '<a href="privacy.html"')
# the screen list is a reviewer tool: hidden in the real app, shown only with ?review
page = page.replace("</style>", "body:not(.review) #index{display:none} body:not(.review){gap:0}\n</style>", 1)
page = page.replace("<body>", "<body>\n<script>if (/[?&]review\\b/.test(location.search)) document.body.classList.add('review');</script>", 1)
open(f"{SITE}/index.html", "w").write(page)
print("site bytes", len(page))
