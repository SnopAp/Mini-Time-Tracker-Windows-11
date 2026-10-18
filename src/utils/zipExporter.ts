import JSZip from 'jszip';

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

export async function downloadProjectZip(
  files: ProjectFile[],
  filename = 'MiniTimeTracker-Electron-Win11.zip'
): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
