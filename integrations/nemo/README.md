# Nemo Integration

Codex++ Linux includes Nemo action templates for Linux Mint and other Cinnamon
desktops that use Nemo as the file manager.

Install the actions for the current user from a source checkout:

```sh
integrations/nemo/install.sh
```

Or from the Debian package install:

```sh
/opt/codex-plusplus-linux/integrations/nemo/install.sh
```

The installer copies the `.nemo_action` files to:

```text
~/.local/share/nemo/actions
```

Restart Nemo after installing if the actions do not appear immediately:

```sh
nemo -q
```
