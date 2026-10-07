const NAVY = "1E3972";
const RED = "D71920";
const GOLD = "D6A51D";

export const reportBrand = { navy: NAVY, red: RED, gold: GOLD, pale: "F4F7FC", ink: "172033", muted: "526174" };

type ZipEntry = { name: string; data: Uint8Array };
type BrandAssets = { facultyDataUrl: string; centerDataUrl: string; facultyBytes: Uint8Array; centerBytes: Uint8Array };

let assetsPromise: Promise<BrandAssets> | undefined;

function bytesToDataUrl(bytes: Uint8Array, type: string) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return `data:${type};base64,${btoa(binary)}`;
}

async function logo(path: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error("No se pudieron cargar los emblemas institucionales.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, dataUrl: bytesToDataUrl(bytes, response.headers.get("content-type") || "image/png") };
}

/** Carga los mismos emblemas que identifica la interfaz, para las dos exportaciones. */
export function loadReportBranding(): Promise<BrandAssets> {
  assetsPromise ??= Promise.all([logo("/branding/fcsh-uagrm-emblem.png"), logo("/branding/centro-especialidades-emblem.png")]).then(([faculty, center]) => ({
    facultyDataUrl: faculty.dataUrl,
    centerDataUrl: center.dataUrl,
    facultyBytes: faculty.bytes,
    centerBytes: center.bytes,
  }));
  return assetsPromise;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function uint16(view: DataView, offset: number) { return view.getUint16(offset, true); }
function uint32(view: DataView, offset: number) { return view.getUint32(offset, true); }
function write16(target: Uint8Array, offset: number, value: number) { new DataView(target.buffer).setUint16(offset, value, true); }
function write32(target: Uint8Array, offset: number, value: number) { new DataView(target.buffer).setUint32(offset, value >>> 0, true); }
const encoder = new TextEncoder();
const decoder = new TextDecoder();

// SheetJS writes the workbook with stored ZIP members when compression is false.
// Rebuilding this small ZIP lets us add OOXML drawings without adding a second XLSX library.
function readStoredZip(source: Uint8Array): ZipEntry[] | null {
  const view = new DataView(source.buffer, source.byteOffset, source.byteLength);
  const entries: ZipEntry[] = [];
  let offset = 0;
  while (offset + 4 <= source.length && uint32(view, offset) === 0x04034b50) {
    const method = uint16(view, offset + 8);
    const compressedSize = uint32(view, offset + 18);
    const nameSize = uint16(view, offset + 26);
    const extraSize = uint16(view, offset + 28);
    if (method !== 0) return null;
    const nameStart = offset + 30;
    const dataStart = nameStart + nameSize + extraSize;
    const end = dataStart + compressedSize;
    if (end > source.length) return null;
    entries.push({ name: decoder.decode(source.subarray(nameStart, nameStart + nameSize)), data: source.slice(dataStart, end) });
    offset = end;
  }
  return entries.length ? entries : null;
}

function makeStoredZip(entries: ZipEntry[]) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localSize = 0;
  for (const entry of entries) {
    const name = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const local = new Uint8Array(30 + name.length + entry.data.length);
    write32(local, 0, 0x04034b50); write16(local, 4, 20); write16(local, 6, 0); write16(local, 8, 0);
    write16(local, 10, 0); write16(local, 12, 0); write32(local, 14, crc); write32(local, 18, entry.data.length); write32(local, 22, entry.data.length);
    write16(local, 26, name.length); write16(local, 28, 0); local.set(name, 30); local.set(entry.data, 30 + name.length);
    localParts.push(local);

    const central = new Uint8Array(46 + name.length);
    write32(central, 0, 0x02014b50); write16(central, 4, 20); write16(central, 6, 20); write16(central, 8, 0); write16(central, 10, 0);
    write16(central, 12, 0); write16(central, 14, 0); write32(central, 16, crc); write32(central, 20, entry.data.length); write32(central, 24, entry.data.length);
    write16(central, 28, name.length); write16(central, 30, 0); write16(central, 32, 0); write16(central, 34, 0); write16(central, 36, 0); write32(central, 38, 0); write32(central, 42, localSize);
    central.set(name, 46); centralParts.push(central); localSize += local.length;
  }
  const centralSize = centralParts.reduce((sum, value) => sum + value.length, 0);
  const output = new Uint8Array(localSize + centralSize + 22);
  let offset = 0;
  for (const part of localParts) { output.set(part, offset); offset += part.length; }
  for (const part of centralParts) { output.set(part, offset); offset += part.length; }
  write32(output, offset, 0x06054b50); write16(output, offset + 4, 0); write16(output, offset + 6, 0); write16(output, offset + 8, entries.length); write16(output, offset + 10, entries.length);
  write32(output, offset + 12, centralSize); write32(output, offset + 16, localSize); write16(output, offset + 20, 0);
  return output;
}

function textEntry(name: string, text: string): ZipEntry { return { name, data: encoder.encode(text) }; }

function upsert(entries: ZipEntry[], entry: ZipEntry) {
  const index = entries.findIndex((current) => current.name === entry.name);
  if (index === -1) entries.push(entry); else entries[index] = entry;
}

function anchor(fromColumn: number, toColumn: number) {
  return `<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${fromColumn}</xdr:col><xdr:colOff>9525</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>9525</xdr:rowOff></xdr:from><xdr:to><xdr:col>${toColumn}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${fromColumn + 1}" name="Emblema ${fromColumn + 1}"/><xdr:cNvPicPr/></xdr:nvPicPr><xdr:blipFill><a:blip r:embed="rId${fromColumn + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill><xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:twoCellAnchor>`;
}

/** Adds both institutional logos to the first sheet of an uncompressed SheetJS XLSX workbook. */
export function addReportLogosToXlsx(source: ArrayBuffer, faculty: Uint8Array, center: Uint8Array) {
  const entries = readStoredZip(new Uint8Array(source));
  if (!entries) return source;
  const getText = (name: string) => decoder.decode(entries.find((entry) => entry.name === name)?.data ?? new Uint8Array());
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheet = getText(sheetPath);
  const contentTypes = getText("[Content_Types].xml");
  if (!sheet || !contentTypes) return source;
  let updatedTypes = contentTypes;
  if (!updatedTypes.includes('Extension="png"')) updatedTypes = updatedTypes.replace("</Types>", '<Default Extension="png" ContentType="image/png"/></Types>');
  updatedTypes = updatedTypes.replace("</Types>", '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/></Types>');
  const drawing = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchor(0, 1)}${anchor(10, 11)}</xdr:wsDr>`;
  const drawingRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/fcsh-uagrm.png"/><Relationship Id="rId11" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/centro-especialidades.png"/></Relationships>`;
  const sheetRelsPath = "xl/worksheets/_rels/sheet1.xml.rels";
  const sheetRels = getText(sheetRelsPath) || '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
  const updatedSheetRels = sheetRels.replace("</Relationships>", '<Relationship Id="rIdReportDrawing" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>');
  const updatedSheet = sheet.includes("rIdReportDrawing") ? sheet : sheet.replace("</worksheet>", '<drawing r:id="rIdReportDrawing"/></worksheet>');
  upsert(entries, textEntry("[Content_Types].xml", updatedTypes)); upsert(entries, textEntry(sheetPath, updatedSheet)); upsert(entries, textEntry(sheetRelsPath, updatedSheetRels));
  upsert(entries, textEntry("xl/drawings/drawing1.xml", drawing)); upsert(entries, textEntry("xl/drawings/_rels/drawing1.xml.rels", drawingRels));
  upsert(entries, { name: "xl/media/fcsh-uagrm.png", data: faculty }); upsert(entries, { name: "xl/media/centro-especialidades.png", data: center });
  return makeStoredZip(entries).buffer;
}
