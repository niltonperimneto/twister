# Releasing Twister

Tagged pushes (`vX.Y.Z`) trigger `.github/workflows/build-appimage.yml`, which
builds the AppImage, signs it for the Tauri updater, emits the `latest.json`
update manifest, and publishes all three files to the GitHub release. The
in-app updater fetches
`https://github.com/niltonperimneto/twister/releases/latest/download/latest.json`
and verifies the AppImage signature against the public key baked into
`src-tauri/tauri.conf.json`.

## One-time setup: updater signing keys

The updater refuses unsigned builds, so a real minisign keypair is required.
Without it the release workflow's "Sign AppImage" step fails and no
`latest.json` is published.

1. Generate a keypair (pick a strong password when prompted):

   ```sh
   bunx tauri signer generate -w ~/.tauri/twister.key
   ```

   This writes the private key to `~/.tauri/twister.key` and prints the
   public key. **Never commit the private key.**

2. Put the printed public key into `src-tauri/tauri.conf.json` at
   `plugins.updater.pubkey`, replacing the
   `REPLACE_WITH_PUBLIC_KEY_FROM_tauri_signer_generate` placeholder, and
   commit that change.

3. Add two repository secrets under
   *Settings → Secrets and variables → Actions*:

   | Secret | Value |
   |---|---|
   | `TAURI_SIGNING_PRIVATE_KEY` | contents of `~/.tauri/twister.key` |
   | `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | the password chosen in step 1 |

If the key is ever lost, generate a new pair and ship the new public key in a
regular (manually downloaded) release first — updaters only trust the key of
the build they are running.

## Cutting a release

```sh
git tag vX.Y.Z
git push origin vX.Y.Z
```

The workflow injects the tag version into the manifests, so `Cargo.toml` /
`package.json` versions are synced automatically at build time. Verify after
the run that the release contains three assets: the `.AppImage`, its `.sig`,
and `latest.json` — the updater needs all of them.
