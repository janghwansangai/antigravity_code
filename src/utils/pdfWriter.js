/**
 * 아주 작은 PDF 만들기: 쪽마다 JPEG 그림 한 장 → A4 PDF 파일
 * (공유용 PDF. 글자도 그림으로 들어가므로 한글 글꼴을 따로 넣을 필요가 없음)
 */

const A4 = { w: 595.28, h: 841.89 }; // pt

/** 한글 제목 등은 UTF-16BE 16진수 문자열로 */
function pdfText(s) {
  let hex = 'FEFF';
  for (const ch of String(s || '')) {
    const code = ch.codePointAt(0);
    if (code > 0xffff) {
      const v = code - 0x10000;
      hex += (0xd800 + (v >> 10)).toString(16).padStart(4, '0') + (0xdc00 + (v & 0x3ff)).toString(16).padStart(4, '0');
    } else hex += code.toString(16).padStart(4, '0');
  }
  return `<${hex.toUpperCase()}>`;
}

/**
 * @param {{ bytes: Uint8Array, width: number, height: number }[]} pages JPEG 쪽 그림
 * @param {{ title?: string, author?: string }} info
 * @returns {Blob} application/pdf
 */
export function buildJpegPdf(pages, info = {}) {
  const enc = new TextEncoder();
  const parts = [];
  const offsets = [];
  let length = 0;
  const push = (chunk) => {
    const bytes = typeof chunk === 'string' ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    length += bytes.length;
  };
  const obj = (n, body) => {
    offsets[n] = length;
    push(`${n} 0 obj\n`);
    for (const b of [].concat(body)) push(b);
    push('\nendobj\n');
  };

  // 1: 목차, 2: 쪽 목록, 3: 문서 정보, 4~: 쪽마다 (쪽, 내용, 그림)
  const pageIds = pages.map((_, i) => 4 + i * 3);
  push('%PDF-1.4\n');
  obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
  obj(2, `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  obj(3, `<< /Title ${pdfText(info.title)} /Author ${pdfText(info.author)} /Producer (Portfolio Maker) >>`);
  pages.forEach((pg, i) => {
    const id = pageIds[i];
    const content = `q ${A4.w} 0 0 ${A4.h} 0 0 cm /Im0 Do Q`;
    obj(id, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4.w} ${A4.h}] /Resources << /XObject << /Im0 ${id + 2} 0 R >> >> /Contents ${id + 1} 0 R >>`);
    obj(id + 1, [`<< /Length ${content.length} >>\nstream\n`, content, '\nendstream']);
    obj(id + 2, [
      `<< /Type /XObject /Subtype /Image /Width ${pg.width} /Height ${pg.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.bytes.length} >>\nstream\n`,
      pg.bytes,
      '\nendstream'
    ]);
  });
  const count = 4 + pages.length * 3;
  const xref = length;
  push(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let n = 1; n < count; n++) push(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
  push(`trailer\n<< /Size ${count} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts, { type: 'application/pdf' });
}
