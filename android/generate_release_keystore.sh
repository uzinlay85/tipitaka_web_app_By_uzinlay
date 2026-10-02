#!/usr/bin/env bash
set -e

KEYSTORE_FILE="tipitaka-release.jks"
ALIAS="tipitaka"

if [ -f "$KEYSTORE_FILE" ]; then
    echo "[WARNING] $KEYSTORE_FILE already exists! Exiting."
    exit 1
fi

read -rsp "Enter password for keystore: " STORE_PASS
echo
if [ -z "$STORE_PASS" ]; then
    echo "Password cannot be empty!"
    exit 1
fi

keytool -genkeypair -v -keystore "$KEYSTORE_FILE" -alias "$ALIAS" -keyalg RSA -keysize 2048 -validity 10000 -storepass "$STORE_PASS" -keypass "$STORE_PASS" -dname "CN=Tipitaka App, OU=Dhamma, O=Upanna, L=Yangon, C=MM"

cat <<EOF > release-keystore.properties
RELEASE_STORE_FILE=$KEYSTORE_FILE
RELEASE_KEY_ALIAS=$ALIAS
RELEASE_STORE_PASSWORD=$STORE_PASS
RELEASE_KEY_PASSWORD=$STORE_PASS
EOF

echo "[SUCCESS] Generated $KEYSTORE_FILE and release-keystore.properties"
