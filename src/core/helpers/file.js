import { Platform } from 'quasar';
import gdrive from '@api/GoogleDrive';

export const downloadFile = (file, fileName, type = '') => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([file.data], { type }));
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const downloadDriveDocx = async (params, data, fileName) => {
  const file = await gdrive.generateDocx(params, data);
  downloadFile(file, fileName);
};

export const downloadZip = (zip, fileName) => {
  downloadFile(zip, fileName, 'application/zip');
};

export const downloadDocx = (docx, fileName) => {
  downloadFile(docx, fileName, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
};

export const downloadCsv = (data, fileName) => {
  let csvContent = '\ufeff'; // UTF16LE BOM for Microsoft Excel
  data.forEach((rowArray) => {
    const row = rowArray.join(';');
    csvContent += `${row}\r\n`;
  });

  return downloadFile({ data: csvContent }, fileName);
};

export const openPdf = (pdf) => {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([pdf.data], { type: 'application/pdf' }));
  document.body.appendChild(link);
  link.setAttribute('target', Platform.is.safari ? '_self' : '_blank');
  link.click();
  document.body.removeChild(link);
};
