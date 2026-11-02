import * as htmlToImage from 'html-to-image';
import { jsPDF } from 'jspdf';

export interface SharePdfOptions {
  elementId: string;
  fileName: string;
  phoneNumber?: string;
  messageText: string;
  documentTitle: string;
}

/**
 * Clean & format Egyptian / international mobile number for direct WhatsApp chat URLs
 * Ensures WhatsApp opens directly into the patient's chat without searching for contacts.
 */
export const formatWhatsAppNumber = (rawPhone: string): string => {
  if (!rawPhone) return '';
  // Remove non-digit characters
  let clean = rawPhone.replace(/\D/g, '');
  
  // Remove leading 00 international prefix
  if (clean.startsWith('00')) {
    clean = clean.substring(2);
  }

  // Egyptian numbers:
  // Starts with 01 (010, 011, 012, 015) and 11 digits: e.g. 01012345678 -> 201012345678
  if (clean.startsWith('0') && clean.length === 11) {
    clean = '2' + clean;
  }
  // 10 digits without leading zero: e.g. 1012345678 -> 201012345678
  else if (clean.length === 10 && ['10', '11', '12', '15'].some(prefix => clean.startsWith(prefix))) {
    clean = '20' + clean;
  }
  // Already has 20 and 12 digits: e.g. 201012345678 -> kept as is

  return clean;
};

/**
 * Generates a high quality PDF Blob from an HTML element
 * Uses html-to-image with skipFonts: true and fontEmbedCSS: '' to avoid
 * SecurityError when reading cross-origin Google Fonts cssRules.
 */
export const generatePdfFromElement = async (
  elementId: string,
  fileName: string = 'document.pdf',
  orientation: 'p' | 'portrait' | 'l' | 'landscape' = 'portrait'
): Promise<{ blob: Blob; file: File; dataUrl: string }> => {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element with id "${elementId}" not found for PDF export.`);
  }

  type HtmlToImageOptions = Parameters<typeof htmlToImage.toCanvas>[1];
  const renderOptions: HtmlToImageOptions = {
    pixelRatio: 2.5, // High resolution rendering for sharp Arabic text
    backgroundColor: '#ffffff',
    skipFonts: true, // Crucial: skips reading remote CSSStyleSheet.cssRules (fixes SecurityError on Google Fonts)
    fontEmbedCSS: '', // Avoids cross-origin font fetching
    cacheBust: true,
    filter: (node: Node) => {
      // Exclude elements with print:hidden class
      if (node instanceof HTMLElement && node.classList.contains('print:hidden')) {
        return false;
      }
      return true;
    },
  };

  let canvas: HTMLCanvasElement;
  try {
    canvas = await htmlToImage.toCanvas(element, renderOptions);
  } catch (canvasErr) {
    console.warn('htmlToImage.toCanvas failed, falling back to toPng with skipFonts:', canvasErr);
    
    // Fallback using toPng with font embedding explicitly disabled
    const pngUrl = await htmlToImage.toPng(element, {
      ...renderOptions,
      pixelRatio: 2,
    });
    
    const img = new Image();
    img.src = pngUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 800;
    canvas.height = img.naturalHeight || 1000;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    }
  }

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  
  // Calculate PDF dimensions based on element aspect ratio
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  
  // Standard A5 proportion (148mm width)
  const pdfWidth = 148;
  const pdfHeight = (imgHeight * pdfWidth) / (imgWidth || 1);

  const pdf = new jsPDF({
    orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [pdfWidth, Math.max(pdfHeight, 100)],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  
  const blob = pdf.output('blob');
  const file = new File([blob], fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`, {
    type: 'application/pdf',
  });
  const dataUrl = pdf.output('datauristring');

  return { blob, file, dataUrl };
};

/**
 * Download a PDF directly in the browser
 */
export const downloadElementAsPdf = async (elementId: string, fileName: string): Promise<boolean> => {
  try {
    const { file } = await generatePdfFromElement(elementId, fileName);
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Error downloading PDF:', err);
    return false;
  }
};

/**
 * Send official Hospital PDF through WhatsApp directly linked to the patient's phone number:
 * 1. Automatically downloads the official branded PDF file locally on the device with a clean hospital filename.
 * 2. Directly opens WhatsApp into that specific patient's chat window using `https://api.whatsapp.com/send?phone=...`
 *    so the receptionist/doctor NEVER has to search for the patient or choose from a contacts list!
 */
export const shareOrSendPdfViaWhatsApp = async ({
  elementId,
  fileName,
  phoneNumber,
  messageText,
  documentTitle,
}: SharePdfOptions): Promise<{ sharedDirectly: boolean; downloaded: boolean; recipientPhone?: string }> => {
  if (!phoneNumber || !phoneNumber.trim()) {
    throw new Error('يرجى تحديد رقم هاتف المريض أو الواتساب أولاً.');
  }

  const cleanPhone = formatWhatsAppNumber(phoneNumber.trim());
  let fileDownloaded = false;
  let finalFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;

  // 1. Generate & download the official branded PDF file
  try {
    const { file } = await generatePdfFromElement(elementId, fileName);
    finalFileName = file.name;

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    fileDownloaded = true;
  } catch (err) {
    console.warn('PDF generation encountered an issue, proceeding with direct WhatsApp message link:', err);
  }

  // 2. Open WhatsApp DIRECTLY targeted to the patient's phone number!
  const fullText = fileDownloaded
    ? `${messageText}\n\n📎 *ملف المستند الرسمي:* تم إصدار وتنزيل ملف PDF المعتمد (${finalFileName}) بهوية مستشفى لجنة الزكاة بميت علي.`
    : messageText;

  // Uses official WhatsApp Direct Link endpoint with phone parameter
  const waUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(fullText)}`;
  
  // Trigger direct opening in new tab
  const link = document.createElement('a');
  link.href = waUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { sharedDirectly: true, downloaded: fileDownloaded, recipientPhone: cleanPhone };
};

/**
 * Optional: Native OS Share sheet (for when the user specifically wants to use system share sheet)
 */
export const shareFileViaSystemShare = async ({
  elementId,
  fileName,
  messageText,
  documentTitle,
}: {
  elementId: string;
  fileName: string;
  messageText: string;
  documentTitle: string;
}): Promise<boolean> => {
  try {
    const { file } = await generatePdfFromElement(elementId, fileName);
    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: `مستشفى لجنة الزكاة بميت علي - ${documentTitle}`,
        text: messageText,
      });
      return true;
    }
  } catch (err: unknown) {
    const error = err as Error;
    if (error.name !== 'AbortError') {
      console.error('System share error:', err);
    }
  }
  return false;
};
