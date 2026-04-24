/**
 * Brotli + Gzip compression middleware using Node.js built-in zlib.
 * Serves Brotli (br) when the client supports it, falls back to gzip.
 * Skips compression for small responses (< 1 KB) and non-compressible types.
 */
import { Request, Response, NextFunction } from 'express';
import zlib from 'zlib';

const COMPRESSIBLE = /json|text|javascript|xml|svg|html/i;
const MIN_SIZE = 1024; // bytes — don't bother for tiny responses

export function brotliCompression(req: Request, res: Response, next: NextFunction) {
  const acceptEncoding = req.headers['accept-encoding'] || '';

  // Patch res.json / res.send to intercept before write
  const originalWrite = res.write.bind(res);
  const originalEnd   = res.end.bind(res);

  // Only compress if content-type is compressible
  function shouldCompress(contentType: string | undefined): boolean {
    if (!contentType) return false;
    return COMPRESSIBLE.test(contentType);
  }

  let compressed = false;
  let compressor: zlib.BrotliCompress | zlib.Gzip | null = null;
  const chunks: Buffer[] = [];

  function maybeSetup() {
    if (compressed) return true;
    const ct = res.getHeader('content-type') as string | undefined;
    if (!shouldCompress(ct)) return false;

    if (/\bbr\b/.test(acceptEncoding)) {
      compressor = zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 } });
      res.setHeader('Content-Encoding', 'br');
    } else if (/\bgzip\b/.test(acceptEncoding)) {
      compressor = zlib.createGzip({ level: 6 });
      res.setHeader('Content-Encoding', 'gzip');
    } else {
      return false;
    }

    res.removeHeader('Content-Length');
    compressed = true;
    return true;
  }

  // Override write: buffer chunks until end
  res.write = function (chunk: unknown, ...args: unknown[]): boolean {
    if (chunk && maybeSetup()) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
      return true;
    }
    return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...args);
  };

  res.end = function (chunk?: unknown, ...args: unknown[]): Response {
    if (chunk && typeof chunk !== 'function') {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }

    if (!compressor || !compressed) {
      return (originalEnd as (...a: unknown[]) => Response)(chunks.length ? Buffer.concat(chunks) : chunk, ...args);
    }

    const body = Buffer.concat(chunks);

    // Skip compression for small payloads
    if (body.length < MIN_SIZE) {
      res.removeHeader('Content-Encoding');
      return (originalEnd as (...a: unknown[]) => Response)(body);
    }

    const stream = compressor;
    const outChunks: Buffer[] = [];

    stream.on('data', (c: Buffer) => outChunks.push(c));
    stream.on('end', () => {
      const out = Buffer.concat(outChunks);
      res.setHeader('Content-Length', out.length);
      (originalEnd as (...a: unknown[]) => Response)(out);
    });
    stream.end(body);

    return res;
  };

  next();
}
