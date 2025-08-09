import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'fs';
import { parse as parseEpub } from 'epub-metadata';
import pdfParse from 'pdf-parse';
import StreamZip from 'node-stream-zip';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Disable features that cause errors in DevTools
app.commandLine.appendSwitch('disable-features', 'Autofill,TranslateUI');
app.commandLine.appendSwitch('disable-web-security');

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Convert image file to data URL
async function imageToDataUrl(filePath: string): Promise<string> {
  try {
    const data = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase().substring(1);
    const mime = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    const dataUrl = `data:${mime};base64,${data.toString('base64')}`;
    return dataUrl;
  } catch (error) {
    console.error('Error converting image to data URL:', error);
    throw error;
  }
}

// Extract cover image from EPUB file
async function extractEpubCover(filePath: string): Promise<string | undefined> {
  try {
    const zip = new StreamZip.async({ file: filePath });
    const entries = await zip.entries();
    
    // Look for common cover image paths in EPUB
    const coverPaths = [
      'cover.jpeg', 'cover.jpg', 'cover.png',
      'images/cover.jpeg', 'images/cover.jpg', 'images/cover.png',
      'OEBPS/cover.jpeg', 'OEBPS/cover.jpg', 'OEBPS/cover.png',
      'OEBPS/images/cover.jpeg', 'OEBPS/images/cover.jpg', 'OEBPS/images/cover.png'
    ];
    
    for (const coverPath of coverPaths) {
      if (entries[coverPath]) {
        // Extract the cover image to a temporary location
        const tempDir = app.getPath('temp');
        const coverFileName = `epub_cover_${Date.now()}_${path.basename(coverPath)}`;
        const coverFilePath = path.join(tempDir, coverFileName);
        
        await zip.extract(coverPath, coverFilePath);
        await zip.close();
        
        // Convert to data URL
        const dataUrl = await imageToDataUrl(coverFilePath);
        
        // Clean up temporary file
        fs.unlinkSync(coverFilePath);
        
        return dataUrl;
      }
    }
    
    await zip.close();
    return undefined;
  } catch (error) {
    console.error('Error extracting EPUB cover:', error);
    return undefined;
  }
}

// Extract metadata from EPUB file
async function extractEpubMetadata(filePath: string): Promise<{title: string, cover?: string}> {
  try {
    const epubData = await parseEpub(filePath);
    const title = epubData.title || path.basename(filePath, path.extname(filePath));
    
    // Try to extract cover image
    const cover = await extractEpubCover(filePath);
    
    return {
      title: title,
      cover: cover
    };
  } catch (error) {
    console.error('Error extracting EPUB metadata:', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      cover: undefined
    };
  }
}

// Extract metadata from PDF file
async function extractPdfMetadata(filePath: string): Promise<{title: string, cover?: string}> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const title = data.info.Title || path.basename(filePath, path.extname(filePath));
    
    // PDFs don't typically have embedded covers in the same way as EPUBs
    // We'll use a placeholder cover
    return {
      title: title,
      cover: undefined
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      cover: undefined
    };
  }
}

// Handle IPC messages from the renderer process
ipcMain.on('import-books', async (event, args) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Books', extensions: ['epub', 'pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const books = [];
    
    for (const filePath of result.filePaths) {
      try {
        // Check if file exists
        await fs.promises.access(filePath);
        
        // Get file extension
        const ext = path.extname(filePath).toLowerCase();
        
        // Extract metadata based on file type
        let metadata;
        if (ext === '.epub') {
          metadata = await extractEpubMetadata(filePath);
        } else if (ext === '.pdf') {
          metadata = await extractPdfMetadata(filePath);
        } else {
          // Fallback for other files
          metadata = {
            title: path.basename(filePath, path.extname(filePath)),
            cover: undefined
          };
        }
        
        books.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          title: metadata.title,
          coverPath: metadata.cover,
          filePath: filePath,
        });
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }
    
    event.reply('import-books-result', books);
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
