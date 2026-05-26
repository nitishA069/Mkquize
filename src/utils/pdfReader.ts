import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';

// Setup worker CDN to avoid packaging overheads and Vite worker bundler issues
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Extracts plain text from a native digital PDF using pdfjs-dist.
 */
export async function extractTextFromPdf(file: File, onProgress?: (pct: number) => void): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let fullText = '';

    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      
      fullText += pageText + '\n';
      
      if (onProgress) {
        onProgress(Math.round((i / numPages) * 100));
      }
    }

    return fullText;
  } catch (err) {
    console.error('Digital PDF text extraction error:', err);
    throw new Error('Could not parse digital PDF file. The file may be password protected or corrupted.');
  }
}

/**
 * Executes high-fidelity English + Hindi OCR over scanned image papers.
 */
export async function extractTextFromImage(file: File, onProgress?: (status: string, pct: number) => void): Promise<string> {
  try {
    const worker = await createWorker('eng+hin', 1, {
      logger: m => {
        if (onProgress && m.status === 'recognizing text') {
          onProgress('OCR Recognizing', Math.round(m.progress * 100));
        } else if (onProgress) {
          onProgress(m.status, 0);
        }
      }
    });

    const ret = await worker.recognize(file);
    await worker.terminate();
    return ret.data.text;
  } catch (err) {
    console.error('OCR character recognition error:', err);
    throw new Error('Image OCR parsing failed. Please upload a clearer assessment scanned sheet.');
  }
}
