import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'fs';
import EPub from 'epub2';
const pdfParse = require('pdf-parse');
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
      nodeIntegration: false,
      contextIsolation: true,
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
  let zip: any = null;
  
  try {
    console.log(`开始提取 EPUB 封面: ${filePath}`);
    
    zip = new StreamZip.async({ file: filePath });
    const entries = await zip.entries();
    
    console.log(`EPUB 文件包含 ${Object.keys(entries).length} 个条目`);
    
    // Look for common cover image paths in EPUB
    const coverPaths = [
      // 根目录
      'cover.jpeg', 'cover.jpg', 'cover.png', 'cover.gif', 'cover.webp',
      // images 目录
      'images/cover.jpeg', 'images/cover.jpg', 'images/cover.png', 'images/cover.gif', 'images/cover.webp',
      // OEBPS 目录
      'OEBPS/cover.jpeg', 'OEBPS/cover.jpg', 'OEBPS/cover.png', 'OEBPS/cover.gif', 'OEBPS/cover.webp',
      'OEBPS/images/cover.jpeg', 'OEBPS/images/cover.jpg', 'OEBPS/images/cover.png', 'OEBPS/images/cover.gif', 'OEBPS/images/cover.webp',
      // 其他可能的路径
      'EPUB/cover.jpeg', 'EPUB/cover.jpg', 'EPUB/cover.png',
      'EPUB/images/cover.jpeg', 'EPUB/images/cover.jpg', 'EPUB/images/cover.png',
      // 查找任何包含 "cover" 的图片文件
      ...Object.keys(entries).filter(entry => 
        entry.toLowerCase().includes('cover') && 
        /\.(jpeg|jpg|png|gif|webp)$/i.test(entry)
      )
    ];
    
    console.log('搜索封面路径:', coverPaths);
    
    for (const coverPath of coverPaths) {
      if (entries[coverPath]) {
        console.log(`找到封面文件: ${coverPath}`);
        
        try {
          // Extract the cover image to a temporary location
          const tempDir = app.getPath('temp');
          const coverFileName = `epub_cover_${Date.now()}_${path.basename(coverPath)}`;
          const coverFilePath = path.join(tempDir, coverFileName);
          
          console.log(`提取封面到临时文件: ${coverFilePath}`);
          
          await zip.extract(coverPath, coverFilePath);
          
          // Convert to data URL
          const dataUrl = await imageToDataUrl(coverFilePath);
          
          console.log(`封面转换成功，大小: ${dataUrl.length} 字符`);
          
          // Clean up temporary file
          fs.unlinkSync(coverFilePath);
          
          return dataUrl;
        } catch (extractError) {
          console.error(`提取封面文件 ${coverPath} 时出错:`, extractError);
          continue; // 尝试下一个路径
        }
      }
    }
    
    // 如果没有找到明确的封面，尝试查找第一个图片文件
    console.log('未找到明确的封面文件，尝试查找第一个图片文件...');
    const imageEntries = Object.keys(entries).filter(entry => 
      /\.(jpeg|jpg|png|gif|webp)$/i.test(entry) &&
      !entry.includes('icon') && 
      !entry.includes('logo')
    );
    
    if (imageEntries.length > 0) {
      const firstImage = imageEntries[0];
      console.log(`使用第一个图片作为封面: ${firstImage}`);
      
      try {
        const tempDir = app.getPath('temp');
        const coverFileName = `epub_cover_${Date.now()}_${path.basename(firstImage)}`;
        const coverFilePath = path.join(tempDir, coverFileName);
        
        await zip.extract(firstImage, coverFilePath);
        const dataUrl = await imageToDataUrl(coverFilePath);
        fs.unlinkSync(coverFilePath);
        
        console.log(`使用 ${firstImage} 作为封面成功`);
        return dataUrl;
      } catch (extractError) {
        console.error(`提取图片文件 ${firstImage} 时出错:`, extractError);
      }
    }
    
    console.log('未找到任何可用的封面图片');
    return undefined;
    
  } catch (error) {
    console.error('提取 EPUB 封面时发生错误:', error);
    return undefined;
  } finally {
    // 确保 zip 文件被正确关闭
    if (zip) {
      try {
        await zip.close();
        console.log('EPUB 文件已关闭');
      } catch (closeError) {
        console.error('关闭 EPUB 文件时出错:', closeError);
      }
    }
  }
}

// Extract metadata from EPUB file using epub2
async function extractEpubMetadata(filePath: string): Promise<{title: string, cover?: string, author?: string, description?: string}> {
  try {
    console.log(`开始提取 EPUB 元数据: ${filePath}`);
    
    const epub = await EPub.createAsync(filePath);
    const epubData = epub;
    
    console.log('EPUB 元数据:', epubData.metadata);
    
    // Extract title from metadata
    let title = path.basename(filePath, path.extname(filePath));
    if (epubData.metadata && epubData.metadata.title) {
      title = epubData.metadata.title;
      console.log(`提取到标题: ${title}`);
    } else {
      console.log(`使用文件名作为标题: ${title}`);
    }
    
    // Extract author if available
    let author: string | undefined;
    if (epubData.metadata && epubData.metadata.creator) {
      author = epubData.metadata.creator;
      console.log(`提取到作者: ${author}`);
    } else {
      console.log('未找到作者信息');
    }
    
    // Extract description if available
    let description: string | undefined;
    if (epubData.metadata && epubData.metadata.description) {
      description = epubData.metadata.description;
      console.log(`提取到描述: ${description}`);
    } else {
      console.log('未找到描述信息');
    }
    
    // Try to extract cover image
    console.log('开始提取封面...');
    const cover = await extractEpubCover(filePath);
    
    if (cover) {
      console.log('封面提取成功');
    } else {
      console.log('封面提取失败');
    }
    
    const result = {
      title: title,
      cover: cover,
      author: author,
      description: description
    };
    
    console.log('EPUB 元数据提取完成:', result);
    return result;
    
  } catch (error) {
    console.error('提取 EPUB 元数据时发生错误:', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      cover: undefined,
      author: undefined,
      description: undefined
    };
  }
}

// Extract metadata from PDF file
async function extractPdfMetadata(filePath: string): Promise<{title: string, cover?: string, author?: string, description?: string}> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    const title = data.info.Title || path.basename(filePath, path.extname(filePath));
    
    // Extract author if available
    let author: string | undefined;
    if (data.info.Author) {
      author = data.info.Author;
    }
    
    // Extract description if available
    let description: string | undefined;
    if (data.info.Subject) {
      description = data.info.Subject;
    }
    
    // PDFs don't typically have embedded covers in the same way as EPUBs
    // We'll use a placeholder cover
    return {
      title: title,
      cover: undefined,
      author: author,
      description: description
    };
  } catch (error) {
    console.error('Error extracting PDF metadata:', error);
    return {
      title: path.basename(filePath, path.extname(filePath)),
      cover: undefined,
      author: undefined,
      description: undefined
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
  console.log('result', result)
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
            cover: undefined,
            author: undefined,
            description: undefined
          };
        }
        
        books.push({
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${filePath}`,
          title: metadata.title,
          coverPath: metadata.cover,
          filePath: filePath,
          author: metadata.author,
          description: metadata.description,
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
