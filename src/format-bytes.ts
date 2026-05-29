export function formatBytes(
  bytes: number | undefined,
  decimals: number = 2
): string | undefined {
  if (!bytes) {
    return;
  }

  if (bytes === 0) {
    return "0 Bytes";
  }

  const dm = decimals < 0 ? 0 : decimals;
  const k = 1024; // 1KB = 1024 Bytes
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  const formattedSize = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

  return `${formattedSize} ${sizes[i]}`;
}