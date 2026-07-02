const { detectImageType } = require('../middleware/secureImageUpload');
const { extractClientIP } = require('../middleware/ipFirewall');

describe('Security hardening helpers', () => {
  test('image magic byte detection rejects scriptable SVG payloads', () => {
    const svgPayload = Buffer.from('<svg><script>alert(1)</script></svg>');
    expect(detectImageType(svgPayload)).toBeNull();
  });

  test('image magic byte detection accepts PNG signatures', () => {
    const pngPayload = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00]);
    expect(detectImageType(pngPayload)).toBe('image/png');
  });

  test('untrusted remote clients cannot spoof X-Forwarded-For', () => {
    const req = {
      headers: { 'x-forwarded-for': '10.0.0.9' },
      socket: { remoteAddress: '203.0.113.50' },
      connection: { remoteAddress: '203.0.113.50' }
    };

    expect(extractClientIP(req)).toBe('203.0.113.50');
  });

  test('trusted local proxy can pass X-Forwarded-For', () => {
    const req = {
      headers: { 'x-forwarded-for': '10.0.0.9, 127.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' },
      connection: { remoteAddress: '127.0.0.1' }
    };

    expect(extractClientIP(req)).toBe('10.0.0.9');
  });
});
