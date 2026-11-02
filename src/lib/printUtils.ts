/**
 * Reliable Printing Utility for AI Studio Web Environment
 * Ensures clean, professional printing of prescriptions, receipts, and thermal tickets
 * Works seamlessly inside iframes and across all desktop & mobile browsers.
 */

export const printElement = (elementId: string, pageTitle: string = 'طباعة مستند رسمي') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Element with ID '${elementId}' not found for printing, falling back to window.print()`);
    try {
      window.focus();
      window.print();
    } catch (err) {
      console.error('Direct window.print() error:', err);
    }
    return;
  }

  // Clone element content
  const contentHtml = element.outerHTML;

  // Collect all stylesheet links and style tags from current document
  const stylesheets = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map(node => node.outerHTML)
    .join('\n');

  // Create isolated hidden iframe for printing
  const iframe = document.createElement('iframe');
  iframe.id = 'print-engine-frame';
  iframe.setAttribute(
    'style',
    'position:fixed;right:0;bottom:0;width:10px;height:10px;border:0;opacity:0;pointer-events:none;z-index:-1;'
  );
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    try {
      window.focus();
      window.print();
    } catch (e) {}
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="utf-8">
      <title>${pageTitle}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
      ${stylesheets}
      <style>
        * { box-sizing: border-box; }
        html, body {
          margin: 0 !important;
          padding: 10px !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-family: 'Cairo', system-ui, -apple-system, sans-serif !important;
          direction: rtl !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        @page {
          size: auto;
          margin: 8mm;
        }
        @media print {
          body {
            padding: 0 !important;
            background: #ffffff !important;
          }
          button, .print\\:hidden, [role="button"] {
            display: none !important;
          }
        }
        /* Ensure all borders and backgrounds appear clearly */
        .border, [class*="border-"] {
          border-color: #cbd5e1 !important;
        }
      </style>
    </head>
    <body class="bg-white text-slate-900">
      <div id="print-wrapper" class="w-full">
        ${contentHtml}
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() {
            try {
              window.focus();
              window.print();
            } catch (err) {
              console.error('Iframe print error:', err);
            }
          }, 300);
        };
      </script>
    </body>
    </html>
  `);
  doc.close();

  // Trigger print from contentWindow with fallback
  setTimeout(() => {
    try {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    } catch (err) {
      console.warn('Iframe print focus fallback:', err);
      try {
        window.focus();
        window.print();
      } catch (e) {}
    }
  }, 450);

  // Clean up iframe after printing dialogue closes
  setTimeout(() => {
    try {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    } catch (e) {}
  }, 60000);
};
