/**
 * OPFSCache - A simple implementation of the Web Cache API subset for OPFS
 * designed to be used with transformers.js custom cache.
 */
export class OPFSCache {
  private constructor(private root: FileSystemDirectoryHandle) {}

  static async open(cacheName: string): Promise<OPFSCache> {
    const root = await navigator.storage.getDirectory();
    const cacheDir = await root.getDirectoryHandle(cacheName, { create: true });
    return new OPFSCache(cacheDir);
  }

  private getSafeFilename(url: string): string {
    // Basic replacement to make it a safe filename. 
    // Transformers.js usually has long but safe-ish URLs.
    return url.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
  }

  async match(request: Request | string): Promise<Response | undefined> {
    const url = typeof request === 'string' ? request : request.url;
    const filename = this.getSafeFilename(url);

    try {
      const fileHandle = await this.root.getFileHandle(filename);
      const file = await fileHandle.getFile();
      
      // We return a Response with the file content.
      // Transformers.js v3 uses this to load model weights.
      return new Response(file, {
        headers: {
          'Content-Type': this.getContentType(url),
          'Content-Length': file.size.toString(),
        }
      });
    } catch (e) {
      // File not found in OPFS
      return undefined;
    }
  }

  async put(request: Request | string, response: Response): Promise<void> {
    const url = typeof request === 'string' ? request : request.url;
    const filename = this.getSafeFilename(url);

    try {
      const fileHandle = await this.root.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      
      const body = response.body;
      if (body) {
        // Stream the body to OPFS for efficiency
        await body.pipeTo(writable);
      } else {
        const blob = await response.blob();
        await writable.write(blob);
        await writable.close();
      }
    } catch (e) {
      console.error('[OPFSCache] Failed to save to OPFS:', filename, e);
    }
  }

  private getContentType(url: string): string {
    if (url.endsWith('.onnx')) return 'application/octet-stream';
    if (url.endsWith('.json')) return 'application/json';
    if (url.endsWith('.bin')) return 'application/octet-stream';
    if (url.endsWith('.wasm')) return 'application/wasm';
    return 'application/octet-stream';
  }
}
