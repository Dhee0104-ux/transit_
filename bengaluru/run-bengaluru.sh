#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JAR="$ROOT/otp-shaded/target/otp-shaded-2.11.0-SNAPSHOT-shaded.jar"
if [ ! -f "$JAR" ]; then
  echo "OTP shaded JAR not found: $JAR"
  exit 1
fi
exec java -Xmx4G -jar "$JAR" --build --serve "$ROOT/bengaluru"
