import React from 'react';
import Button from '.';
import { BiSolidFileImport } from 'react-icons/bi';
export default function ImportBook() {
  const handleImportBooks = () => {
    console.log('Window object:', window);
    console.log('Window.electron:', (window as any).electron);

    const electron = (window as any).electron;
    if (electron && electron.ipcRenderer) {
      console.log('Sending import-books message to main process');
      electron.ipcRenderer.send('import-books');
    }
  };
  return (
    <Button
      type="icon"
      icon={<BiSolidFileImport size={24} />}
      onClick={handleImportBooks}
    />
  );
}
