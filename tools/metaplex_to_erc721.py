"""
Convert the 3,000 Metaplex (Solana) metadata files to ERC-721 metadata for
Robinhood Chain.

Nothing is written until you supply --base-uri, and output always goes to a new
directory, so the original Solana metadata is never touched.

    python site/tools/metaplex_to_erc721.py \
        --base-uri ipfs://bafy.../ \
        --out "SWAGFAG SKELLY CLUB/FULL COLLECTION/erc721"

What changes:

  attributes                  kept as-is — Metaplex and ERC-721/OpenSea already
                              agree on [{trait_type, value}]
  image: "0.png"           →  image: "<base-uri>0.png"
  name: "SWAGFAG #0"          kept
  description                 kept
  symbol                   →  dropped (lives in the contract, not the token)
  collection               →  dropped (lives in the contract)
  properties.creators      →  dropped (Solana-only; royalties move to ERC-2981)
  seller_fee_basis_points  →  dropped (set royaltyInfo() in the contract)
  properties.files         →  dropped (Solana-only)

Royalties are NOT part of ERC-721 metadata. The 500 bps has to be set on the
contract via ERC-2981 royaltyInfo(), and marketplaces honour that at their own
discretion — it is not enforced on-chain the way Metaplex enforced it.
"""

import argparse, json, os, sys

SRC_DEFAULT = os.path.join("SWAGFAG SKELLY CLUB", "FULL COLLECTION", "deep_fried")


def convert(meta, base_uri):
    image = meta.get("image", "")
    return {
        "name":        meta.get("name", ""),
        "description": meta.get("description", "").strip(),
        "image":       base_uri + image if image else "",
        "attributes":  meta.get("attributes", []),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=SRC_DEFAULT,
                    help="folder of Metaplex .json files")
    ap.add_argument("--out", required=True,
                    help="output folder (created; must not already hold .json)")
    ap.add_argument("--base-uri", required=True,
                    help="prefix for image URIs, e.g. ipfs://<cid>/ — include the trailing slash")
    ap.add_argument("--extension", action="store_true",
                    help="write files as <id>.json (default is extensionless <id>, "
                         "which is what most ERC-721 tokenURI schemes expect)")
    a = ap.parse_args()

    if not a.base_uri.endswith("/"):
        sys.exit("--base-uri must end with '/' or every image path will be malformed")

    os.makedirs(a.out, exist_ok=True)
    if any(f.endswith(".json") for f in os.listdir(a.out)):
        sys.exit(f"{a.out} already contains .json files — refusing to overwrite")

    ids = sorted(int(f[:-5]) for f in os.listdir(a.src) if f.endswith(".json"))
    if not ids:
        sys.exit(f"no .json files found in {a.src}")

    for i in ids:
        with open(os.path.join(a.src, f"{i}.json"), encoding="utf-8") as fh:
            out = convert(json.load(fh), a.base_uri)
        name = f"{i}.json" if a.extension else str(i)
        with open(os.path.join(a.out, name), "w", encoding="utf-8") as fh:
            json.dump(out, fh, ensure_ascii=False, indent=2)

    print(f"converted {len(ids)} tokens → {a.out}")
    print(f"sample tokenURI: {a.base_uri.rstrip('/')}/…  image: {a.base_uri}0.png")
    print("\nStill to do on the contract side:")
    print("  • name / symbol (SFSC)      → constructor")
    print("  • 500 bps royalty           → ERC-2981 royaltyInfo()")
    print("  • baseURI for tokenURI()    → the folder you just wrote")


if __name__ == "__main__":
    main()
