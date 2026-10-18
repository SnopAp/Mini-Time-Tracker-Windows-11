import JSZip from 'jszip';

export interface ProjectFile {
  path: string;
  name: string;
  content: string;
  language: string;
}

export async function downloadProjectZip(files: ProjectFile[]): Promise<void> {
  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'MiniTimeTracker-WPF-DotNet10.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
