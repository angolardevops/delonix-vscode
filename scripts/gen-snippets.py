#!/usr/bin/env python3
"""Gera os snippets a partir do REGISTO do motor, nunca à mão.

Um snippet escrito à mão é uma segunda fonte de verdade sobre que Kinds existem
e com que `apiVersion` — e a primeira coisa que fica errada quando um Kind é
renomeado. Aqui a lista sai do `delonix api-resources -o json`, que é o mesmo
registo que o parser, o schema e o reconciliador leem.

    python3 scripts/gen-snippets.py [caminho-do-delonix] > snippets/kinds.code-snippets
"""
import json, subprocess, sys

BIN = sys.argv[1] if len(sys.argv) > 1 else "delonix"
rows = json.loads(subprocess.run([BIN, "api-resources", "-o", "json"],
                                 capture_output=True, text=True, check=True).stdout)

# Um Kind que não sobrevive ao load não leva snippet: oferecer `kind: Egress`
# no autocomplete é ensinar a escrever o que o motor reescreve a seguir. Os
# `sunset` também ficam de fora — existem, mas o snippet é para o caminho a
# seguir, não para o que está a sair.
snips = {}
for r in sorted(rows, key=lambda r: r["kind"]):
    if r["form"] != "primary":
        continue
    kind = r["kind"]
    snips[f"Delonix: {kind}"] = {
        "prefix": [f"delonix-{r['name']}", f"dlx{kind.lower()}"],
        "scope": "yaml",
        "description": f"{kind} ({r['apiVersion']})",
        "body": [
            f"apiVersion: {r['apiVersion']}",
            f"kind: {kind}",
            "metadata:",
            "  name: ${1:nome}" + ("\n  namespace: ${2:default}" if r["namespaced"] else ""),
            "spec:",
            "  $0",
        ],
    }
print(json.dumps(snips, indent=2, ensure_ascii=False))
