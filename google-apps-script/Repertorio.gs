const REPERTORIO_PARTITURAS_FOLDER_ID = '109ydJ3fDyuZOJ_XE1bynFV6UwG26H1gy';

function listRepertoire() {
  const folder = DriveApp.getFolderById(REPERTORIO_PARTITURAS_FOLDER_ID);
  const iterator = folder.getFiles();
  const allowed = /\.(musicxml|xml|mxl|mid|midi|pdf)$/i;
  const files = [];
  while (iterator.hasNext()) {
    const file = iterator.next();
    if (!allowed.test(file.getName())) continue;
    files.push({ id: file.getId(), name: file.getName(), mimeType: file.getMimeType(), size: file.getSize() });
  }
  files.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  return { ok: true, files: files };
}

function getRepertoireFile(payload) {
  const id = String((payload || {}).id || '');
  if (!id) return { ok: false, message: 'Arquivo não informado.' };
  const file = DriveApp.getFileById(id);
  const parents = file.getParents();
  let authorized = false;
  while (parents.hasNext()) if (parents.next().getId() === REPERTORIO_PARTITURAS_FOLDER_ID) authorized = true;
  if (!authorized) return { ok: false, message: 'Arquivo fora do repertório autorizado.' };
  if (!/\.(musicxml|xml)$/i.test(file.getName())) return { ok: false, message: 'Para leitura animada, use MusicXML sem compactação.' };
  return { ok: true, id: id, name: file.getName(), text: file.getBlob().getDataAsString('UTF-8') };
}
