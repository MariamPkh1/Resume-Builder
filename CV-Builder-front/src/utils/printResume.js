import html2pdf from "html2pdf.js";

export const printResume = async (elementId, filename = "resume.pdf") => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found`);
    return;
  }

  const options = {
    margin: 10,
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { 
      scale: 3, 
      useCORS: true,
      onclone: (clonedDoc) => {
        const resume = clonedDoc.getElementById(elementId);
        if (resume) {
          // Force sRGB to prevent oklch color crashes in the PDF engine
          resume.style.colorInterpolation = "sRGB";
          
          const allElements = resume.querySelectorAll('*');
          allElements.forEach(el => {
            const style = window.getComputedStyle(el);
            // Convert oklch variables to safe hex codes for the capture
            if (style.color.includes('oklch')) el.style.color = '#111827';
            if (style.backgroundColor.includes('oklch')) {
               el.style.backgroundColor = el.classList.contains('bg-white') ? '#ffffff' : 'transparent';
            }
          });

          // Fix icons (SVGs) specifically
          const svgs = resume.querySelectorAll('svg');
          svgs.forEach(svg => {
            svg.setAttribute('stroke', '#374151');
            svg.style.stroke = '#374151';
          });
        }
      }
    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  return html2pdf().set(options).from(element).save();
};