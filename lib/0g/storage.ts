import {
  Blob as ZgBlob,
  Indexer,
  StorageNode,
  DEFAULT_SEGMENT_MAX_CHUNKS,
} from '@0glabs/0g-ts-sdk';
import { BrowserProvider } from 'ethers';

const INDEXER_RPC = 'https://rpc-storage-testnet.0g.ai';
const EVM_RPC     = 'https://evmrpc-testnet.0g.ai';

// DEFAULT_CHUNK_SIZE from the SDK is 256 bytes
const CHUNK_SIZE = 256;

/**
 * Uploads a file to 0G decentralized storage.
 * Requires a browser wallet (window.ethereum) for the on-chain submission.
 *
 * @param file  The browser File object to upload.
 * @returns     The root hash of the stored file — save this as the storageHash.
 */
export async function uploadToZeroG(file: File): Promise<string> {
  try {
    console.log('[0G] Preparing upload:', file.name, `(${file.size} bytes)`);

    // Wrap the browser File in the SDK's Blob abstraction
    const zgFile = new ZgBlob(file);

    // Compute the Merkle tree to derive the root hash before uploading
    console.log('[0G] Computing Merkle tree...');
    const [tree, treeErr] = await zgFile.merkleTree();
    if (treeErr || !tree) {
      throw treeErr ?? new Error('Failed to build Merkle tree');
    }

    const rootHash = tree.rootHash();
    if (!rootHash) throw new Error('Failed to compute root hash');
    console.log('[0G] Root hash:', rootHash);

    // Request signer from the connected wallet (RainbowKit / window.ethereum)
    console.log('[0G] Requesting wallet signature...');
    const ethProvider = new BrowserProvider((window as Window & { ethereum: unknown }).ethereum);
    const signer = await ethProvider.getSigner();

    // Upload via the 0G indexer — it selects storage nodes and submits the tx
    const indexer = new Indexer(INDEXER_RPC);
    console.log('[0G] Uploading to 0G Storage network...');

    // Cast: ethers ESM vs CJS declaration mismatch in Signer type — same runtime object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, uploadErr] = await indexer.upload(zgFile, EVM_RPC, signer as any);
    if (uploadErr || !result) {
      throw uploadErr ?? new Error('Upload returned no result');
    }

    console.log('[0G] Upload complete. On-chain tx:', result.txHash);
    return result.rootHash;
  } catch (err) {
    console.error('[0G] Upload failed:', err);
    throw err;
  }
}

/**
 * Downloads a file from 0G decentralized storage by its root hash.
 * Fetches all segments from a storage node and reassembles them in memory.
 *
 * @param hash  The root hash returned by uploadToZeroG (or stored on-chain).
 * @returns     The file content as a Blob.
 */
export async function downloadFromZeroG(hash: string): Promise<Blob> {
  try {
    console.log('[0G] Locating file on network:', hash);

    // Find which storage nodes hold this file
    const indexer   = new Indexer(INDEXER_RPC);
    const locations = await indexer.getFileLocations(hash);

    if (!locations || locations.length === 0) {
      throw new Error(`File not found on 0G network: ${hash}`);
    }

    const nodeUrl = locations[0].url;
    console.log('[0G] Fetching metadata from node:', nodeUrl);

    const node     = new StorageNode(nodeUrl);
    const fileInfo = await node.getFileInfo(hash, true);

    if (!fileInfo) {
      throw new Error('File metadata not found — file may still be propagating');
    }

    const fileSize    = Number(fileInfo.tx.size);
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);
    const numSegments = Math.ceil(totalChunks / DEFAULT_SEGMENT_MAX_CHUNKS);

    console.log(
      `[0G] Downloading ${numSegments} segment(s), ${fileSize} bytes total...`
    );

    const parts: Uint8Array[] = [];

    for (let i = 0; i < numSegments; i++) {
      const startChunk = i * DEFAULT_SEGMENT_MAX_CHUNKS;
      const endChunk   = Math.min((i + 1) * DEFAULT_SEGMENT_MAX_CHUNKS, totalChunks);

      console.log(`[0G] Downloading segment ${i + 1} / ${numSegments}...`);

      // downloadSegment returns a Base64-encoded string of the raw bytes
      const segment = await node.downloadSegment(hash, startChunk, endChunk) as string;

      const binary = atob(segment);
      const bytes  = new Uint8Array(binary.length);
      for (let j = 0; j < binary.length; j++) {
        bytes[j] = binary.charCodeAt(j);
      }
      parts.push(bytes);
    }

    // Concatenate all segments
    const totalLen = parts.reduce((sum, p) => sum + p.length, 0);
    const merged   = new Uint8Array(totalLen);
    let offset     = 0;
    for (const part of parts) {
      merged.set(part, offset);
      offset += part.length;
    }

    // Trim to the actual file size (last segment is padded to chunk boundary)
    console.log('[0G] Download complete.');
    return new Blob([merged.slice(0, fileSize)]);
  } catch (err) {
    console.error('[0G] Download failed:', err);
    throw err;
  }
}
