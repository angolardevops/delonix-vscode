#!/usr/bin/env bash
# Re-importa a gramática do VMfile a partir do MOTOR.
#
# A gramática não se escreve aqui: o `delonix syntax vscode` gera-a das mesmas
# palavras-chave que o parser aceita. Uma cópia escrita à mão nesta extensão
# seria uma segunda fonte de verdade sobre a linguagem, e a primeira coisa a
# ficar errada quando o VMfile ganhar uma directiva.
set -euo pipefail
BIN=${1:-delonix}
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
"$BIN" syntax vscode --dir "$tmp"
cp "$tmp/syntaxes/vmfile.tmLanguage.json" syntaxes/
cp "$tmp/language-configuration.json" .
echo "gramática re-importada de $("$BIN" --version | head -1)"
