from pathlib import Path

ROOT = Path(".")
SCRIPT = '<script src="/fizica-galaction/assets/js/app.js" defer></script>'

modificate = []
deja_existente = []
fara_body = []

for fisier in ROOT.rglob("*.html"):
    continut = fisier.read_text(encoding="utf-8")

    if "assets/js/app.js" in continut:
        deja_existente.append(str(fisier))
        continue

    pozitie = continut.lower().rfind("</body>")

    if pozitie == -1:
        fara_body.append(str(fisier))
        continue

    continut_nou = (
        continut[:pozitie].rstrip()
        + "\n\n  "
        + SCRIPT
        + "\n"
        + continut[pozitie:]
    )

    fisier.write_text(continut_nou, encoding="utf-8")
    modificate.append(str(fisier))

print(f"Pagini modificate: {len(modificate)}")
for fisier in modificate:
    print(f"  + {fisier}")

print(f"\nScript deja prezent: {len(deja_existente)}")
for fisier in deja_existente:
    print(f"  = {fisier}")

print(f"\nPagini fără </body>: {len(fara_body)}")
for fisier in fara_body:
    print(f"  ! {fisier}")
