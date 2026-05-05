#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PKG_NAME="codex-plusplus-linux"
VERSION="$(node -p "require('${ROOT}/package.json').version")"
ARCH="amd64"
BUILD_ROOT="${ROOT}/dist/deb/${PKG_NAME}_${VERSION}_${ARCH}"
DEB_PATH="${ROOT}/dist/${PKG_NAME}_${VERSION}_${ARCH}.deb"

rm -rf "${BUILD_ROOT}"
mkdir -p \
  "${BUILD_ROOT}/DEBIAN" \
  "${BUILD_ROOT}/opt/${PKG_NAME}" \
  "${BUILD_ROOT}/usr/bin" \
  "${BUILD_ROOT}/usr/share/applications" \
  "${BUILD_ROOT}/usr/share/icons/hicolor/256x256/apps" \
  "${BUILD_ROOT}/usr/share/icons/hicolor/scalable/apps" \
  "${BUILD_ROOT}/usr/share/doc/${PKG_NAME}" \
  "${BUILD_ROOT}/usr/lib/systemd/user"

cp "${ROOT}/packaging/debian/control" "${BUILD_ROOT}/DEBIAN/control"
cp "${ROOT}/packaging/debian/postinst" "${BUILD_ROOT}/DEBIAN/postinst"
cp "${ROOT}/packaging/debian/postrm" "${BUILD_ROOT}/DEBIAN/postrm"
chmod 0755 "${BUILD_ROOT}/DEBIAN/postinst" "${BUILD_ROOT}/DEBIAN/postrm"

rsync -a \
  --exclude ".git" \
  --exclude "dist" \
  --exclude "*.tgz" \
  "${ROOT}/" "${BUILD_ROOT}/opt/${PKG_NAME}/"

cat > "${BUILD_ROOT}/usr/bin/codex-plusplus-linux" <<'EOF'
#!/usr/bin/env sh
exec node /opt/codex-plusplus-linux/bin/codex-plusplus-linux.js "$@"
EOF
chmod 0755 "${BUILD_ROOT}/usr/bin/codex-plusplus-linux"

cat > "${BUILD_ROOT}/usr/bin/codex++" <<'EOF'
#!/usr/bin/env sh
exec node /opt/codex-plusplus-linux/bin/codex-plusplus-linux.js "$@"
EOF
chmod 0755 "${BUILD_ROOT}/usr/bin/codex++"

cat > "${BUILD_ROOT}/usr/bin/codex-here" <<'EOF'
#!/usr/bin/env sh
exec node /opt/codex-plusplus-linux/bin/codex-plusplus-linux.js open "${PWD}"
EOF
chmod 0755 "${BUILD_ROOT}/usr/bin/codex-here"

cp "${ROOT}/packaging/debian/codex-plusplus-linux.desktop" \
  "${BUILD_ROOT}/usr/share/applications/codex-plusplus-linux.desktop"
cp "${ROOT}/assets/codex-plusplus-linux.png" \
  "${BUILD_ROOT}/usr/share/icons/hicolor/256x256/apps/codex-plusplus-linux.png"
cp "${ROOT}/assets/codex-plusplus-linux.svg" \
  "${BUILD_ROOT}/usr/share/icons/hicolor/scalable/apps/codex-plusplus-linux.svg"
cp "${ROOT}/README.md" "${BUILD_ROOT}/usr/share/doc/${PKG_NAME}/README.md"
cp "${ROOT}/LICENSE" "${BUILD_ROOT}/usr/share/doc/${PKG_NAME}/copyright"
cp "${ROOT}/packaging/systemd/codex-plusplus-linux-daemon.service" \
  "${BUILD_ROOT}/usr/lib/systemd/user/codex-plusplus-linux-daemon.service"

mkdir -p "$(dirname "${DEB_PATH}")"
fakeroot dpkg-deb --build "${BUILD_ROOT}" "${DEB_PATH}"
echo "${DEB_PATH}"
