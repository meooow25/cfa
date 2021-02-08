/** 
 * UDF with ID CRC32_9.
 * Returns the lowest 9 bits of the input's CRC32 hash as hex.
 * Adapted from https://stackoverflow.com/a/18639999.
 */
function crc32_9(input) {
  const table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (var k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[n] = c;
  }
  let crc = -1;
  for (let i = 0; i < input.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ input.charCodeAt(i)) & 0xFF];
  }
  crc = crc ^ -1;
  return (crc & 0x1FF).toString(16).padStart(3, '0');
};
