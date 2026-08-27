# Publishing

The release workflow packages the `.vsix`, attaches it to the GitHub release,
and then tries each gallery. **Each gallery needs a credential this repository
does not have**, and a missing one skips that step rather than failing the
release — a release with the artefact and no gallery is still installable by
hand.

Both tokens are entered by a human, in the provider's own interface, and stored
as repository secrets. Nothing else in this repo needs them.

## Visual Studio Marketplace — secret `VSCE_PAT`

Reaches VS Code proper.

1. Create a publisher named **`angolardevops`** at
   <https://marketplace.visualstudio.com/manage> (a Microsoft/Azure DevOps
   account is required; the publisher name must match `publisher` in
   `package.json`, or `vsce` refuses to publish).
2. In Azure DevOps, create a Personal Access Token with
   **Marketplace → Manage**, scoped to **all accessible organizations**. Scoping
   it to one organization is the usual reason a valid-looking token gets a 401.
3. `gh secret set VSCE_PAT --repo angolardevops/delonix-vscode`

## Open VSX — secret `OVSX_PAT`

Reaches VSCodium, Cursor, Windsurf and Antigravity, which do not resolve from
the Microsoft gallery. **Publishing to only the Marketplace would leave most of
the editors this extension supports unable to find it by name.**

1. Sign in at <https://open-vsx.org> with GitHub and create the namespace
   **`angolardevops`**.
2. Sign the publisher agreement — Open VSX refuses the first publish without it,
   with an error that does not say so plainly.
3. Generate an access token in the profile settings.
4. `gh secret set OVSX_PAT --repo angolardevops/delonix-vscode`

## Releasing

```bash
git tag -a v0.2.0 -m "..." && git push origin v0.2.0
```

The engine's release workflow pulls the newest `.vsix` from here into its own
signed `SHA256SUMS`, so `install.sh` can install it over one verified supply
chain. An engine release cut before any extension release simply ships without
it, and its installer says so.
