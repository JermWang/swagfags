import json, os, collections

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "SWAGFAG SKELLY CLUB", "FULL COLLECTION", "deep_fried")
OUT = os.path.dirname(os.path.abspath(__file__))

ids = sorted(int(f[:-5]) for f in os.listdir(SRC) if f.endswith(".json"))
print("json files:", len(ids))

counts = collections.defaultdict(collections.Counter)
tokens = {}
for i in ids:
    with open(os.path.join(SRC, f"{i}.json"), encoding="utf-8") as fh:
        m = json.load(fh)
    attrs = {a["trait_type"]: a["value"] for a in m["attributes"]}
    tokens[i] = attrs
    for k, v in attrs.items():
        counts[k][v] += 1

total = len(ids)
# rarity score = sum of 1/frequency per trait
scored = []
for i, attrs in tokens.items():
    score = sum(total / counts[k][v] for k, v in attrs.items())
    scored.append((score, i))
scored.sort(reverse=True)
rank = {i: r + 1 for r, (s, i) in enumerate(scored)}

with open(os.path.join(OUT, "rarity.json"), "w", encoding="utf-8") as fh:
    json.dump({
        "total": total,
        "categories": {k: dict(v.most_common()) for k, v in counts.items()},
        "tokens": {str(i): {"traits": tokens[i], "rank": rank[i]} for i in ids},
    }, fh)

print("supply:", total)
for k, v in counts.items():
    print(f"  {k}: {len(v)} values")
print("rarest 10:", [i for s, i in scored[:10]])
