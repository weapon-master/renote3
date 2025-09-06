import { app, BrowserWindow, ipcMain, dialog, protocol } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs from 'fs';
import EPub from 'epub2';
import pdfParse from 'pdf-parse';
import StreamZip from 'node-stream-zip';
import { 
  initDatabase, 
  closeDatabase, 
  getAllBooks, 
  createBook, 
  updateBook, 
  deleteBook, 
  updateReadingProgress,
  getAnnotationsByBookId,
  createAnnotation,
  updateAnnotation,
  deleteAnnotation,
  getNoteConnectionsByBookId,
  createNoteConnection,
  updateNoteConnection,
  deleteNoteConnection,
  batchUpdateNoteConnections,
  getCardsByAnnotationIds,
  createCard,
  updateCard,
  batchUpdateCards,
  deleteCardsByAnnotationId,
  deleteCards
} from './main/db';


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Disable features that cause errors in DevTools
app.commandLine.appendSwitch('remote-debugging-port', '9222');
app.commandLine.appendSwitch('disable-features', 'Autofill,TranslateUI');
app.commandLine.appendSwitch('disable-web-security');

// Database will be initialized in app.on('ready')

const createWindow = async () => {
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
  const installExtension = require('electron-devtools-installer').default;
  const { REACT_DEVELOPER_TOOLS } = require('electron-devtools-installer');
  try {
    await installExtension(REACT_DEVELOPER_TOOLS);
    console.log('React DevTools installed!');
  } catch (err) {
    console.log('Failed to install React DevTools:', err);
  }
  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // 初始化数据库
  try {
    initDatabase();
    console.log('数据库初始化成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
  }
  
  // 注册EPUB相关的IPC处理器
  registerEpubHandlers();
  // 注册数据库相关的IPC处理器
  registerDatabaseHandlers();
  // 注册LLM相关的IPC处理器
  registerLlmHandlers();
  // 注册自定义协议以安全地从本地文件系统提供 EPUB 资源
  try {
    protocol.registerFileProtocol('epub-local', (request, callback) => {
      try {
        // request.url 类似于 epub-local:///C%3A%5Cpath%5Cto%5Cfile.epub
        const encodedPath = request.url.replace('epub-local:///', '');
        const decodedPath = decodeURIComponent(encodedPath);
        const normalizedPath = path.normalize(decodedPath);
        // 允许访问的根目录：用户数据、临时目录、下载目录和任意绝对路径（受后续 fs 权限控制）
        // 这里主要防止协议滥用，确保是绝对路径
        if (path.isAbsolute(normalizedPath)) {
          callback({ path: normalizedPath });
        } else {
          callback({ error: -6 }); // net::ERR_FILE_NOT_FOUND
        }
      } catch (e) {
        console.error('epub-local protocol error:', e);
        callback({ error: -2 }); // net::FAILED
      }
    });
  } catch (e) {
    console.error('Failed to register epub-local protocol:', e);
  }
  
  // 创建主窗口
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // 关闭数据库连接
  closeDatabase();
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
    
    // 保存新导入的书籍到数据库
    if (books.length > 0) {
      for (const book of books) {
        try {
          createBook({
            title: book.title,
            coverPath: book.coverPath,
            filePath: book.filePath,
            author: book.author,
            description: book.description
          });
        } catch (error) {
          console.error(`Error saving book ${book.title} to database:`, error);
        }
      }
    }
    
    event.reply('import-books-result', books);
  }
});





// 注册数据库相关的IPC处理器
function registerDatabaseHandlers() {
  // 获取所有书籍 (兼容旧API)
  ipcMain.handle('load-books', async () => {
    try {
      const books = getAllBooks();
      console.log(`从数据库加载了 ${books.length} 本书籍`);
      return books;
    } catch (error) {
      console.error('从数据库加载书籍时出错:', error);
      return [];
    }
  });

  // 保存书籍数据 (已弃用，现在使用数据库)
  ipcMain.handle('save-books', async () => {
    try {
      console.log('save-books API 已弃用，现在使用数据库存储');
      return { success: true };
    } catch (error) {
      console.error('保存书籍数据时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取所有书籍 (新API)
  ipcMain.handle('get-all-books', async (event) => {
    try {
      const books = getAllBooks();
      console.log(`从数据库加载了 ${books.length} 本书籍`);
      return books;
    } catch (error) {
      console.error('从数据库加载书籍时出错:', error);
      return [];
    }
  });

  // 创建书籍
  ipcMain.handle('create-book', async (event, book: any) => {
    try {
      const newBook = createBook(book);
      console.log(`创建了新的书籍: ${newBook.id}`);
      return newBook;
    } catch (error) {
      console.error('创建书籍时出错:', error);
      throw error;
    }
  });

  // 更新书籍
  ipcMain.handle('update-book', async (event, id: string, updates: any) => {
    try {
      const success = updateBook(id, updates);
      if (success) {
        console.log(`书籍 ${id} 已更新`);
        return { success: true };
      } else {
        return { success: false, error: '书籍不存在' };
      }
    } catch (error) {
      console.error('更新书籍时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除书籍
  ipcMain.handle('delete-book', async (event, id: string) => {
    try {
      const success = deleteBook(id);
      if (success) {
        console.log(`书籍 ${id} 已删除`);
        return { success: true };
      } else {
        return { success: false, error: '书籍不存在' };
      }
    } catch (error) {
      console.error('删除书籍时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取书籍的笔记连接
  ipcMain.handle('get-note-connections-by-book-id', async (event, bookId: string) => {
    try {
      const connections = getNoteConnectionsByBookId(bookId);
      console.log(`从数据库加载了 ${connections.length} 个笔记连接`);
      return connections;
    } catch (error) {
      console.error('从数据库加载笔记连接时出错:', error);
      return [];
    }
  });

  // 创建笔记连接
  ipcMain.handle('create-note-connection', async (event, connection: any) => {
    try {
      const newConnection = createNoteConnection(connection);
      console.log(`创建了新的笔记连接: ${newConnection.id}`);
      return newConnection;
    } catch (error) {
      console.error('创建笔记连接时出错:', error);
      throw error;
    }
  });

  // 更新笔记连接
  ipcMain.handle('update-note-connection', async (event, id: string, updates: any) => {
    try {
      const success = updateNoteConnection(id, updates);
      if (success) {
        console.log(`笔记连接 ${id} 已更新`);
        return { success: true };
      } else {
        return { success: false, error: '笔记连接不存在' };
      }
    } catch (error) {
      console.error('更新笔记连接时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除笔记连接
  ipcMain.handle('delete-note-connection', async (event, id: string) => {
    try {
      const success = deleteNoteConnection(id);
      if (success) {
        console.log(`笔记连接 ${id} 已删除`);
        return { success: true };
      } else {
        return { success: false, error: '笔记连接不存在' };
      }
    } catch (error) {
      console.error('删除笔记连接时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 批量更新笔记连接
  ipcMain.handle('batch-update-note-connections', async (event, bookId: string, connections: any[]) => {
    try {
      batchUpdateNoteConnections(bookId, connections);
      console.log(`批量更新了 ${connections.length} 个笔记连接`);
      return { success: true };
    } catch (error) {
      console.error('批量更新笔记连接时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新单个注释
  ipcMain.handle('update-annotation', async (event, id: string, updates: any) => {
    try {
      const success = updateAnnotation(id, updates);
      if (success) {
        console.log(`注释 ${id} 已更新`);
        return { success: true };
      } else {
        return { success: false, error: '注释不存在' };
      }
    } catch (error) {
      console.error('更新注释时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取注释
  ipcMain.handle('get-annotations-by-book-id', async (event, bookId: string) => {
    try {
      const annotations = getAnnotationsByBookId(bookId);
      console.log(`从数据库加载了 ${annotations.length} 个注释`);
      return annotations;
    } catch (error) {
      console.error('从数据库加载注释时出错:', error);
      return [];
    }
  });

  // 创建注释
  ipcMain.handle('create-annotation', async (event, bookId: string, annotation: any) => {
    try {
      const newAnnotation = createAnnotation(bookId, annotation);
      console.log(`创建了新的注释: ${newAnnotation.id}`);
      return newAnnotation;
    } catch (error) {
      console.error('创建注释时出错:', error);
      throw error;
    }
  });

  // 删除注释
  ipcMain.handle('delete-annotation', async (event, id: string) => {
    try {
      const success = deleteAnnotation(id);
      if (success) {
        console.log(`注释 ${id} 已删除`);
        return { success: true };
      } else {
        return { success: false, error: '注释不存在' };
      }
    } catch (error) {
      console.error('删除注释时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 获取卡片
  ipcMain.handle('get-cards-by-annotation-ids', async (event, annotationIds: string[]) => {
    try {
      const cards = getCardsByAnnotationIds(annotationIds);
      console.log(`从数据库加载了 ${cards.length} 个卡片`);
      return cards;
    } catch (error) {
      console.error('从数据库加载卡片时出错:', error);
      return [];
    }
  });

  // 创建卡片
  ipcMain.handle('create-card', async (event, annotationId: string, card: any) => {
    try {
      const newCard = createCard(annotationId, card);
      console.log(`创建了新的卡片: ${newCard.id}`);
      return newCard;
    } catch (error) {
      console.error('创建卡片时出错:', error);
      throw error;
    }
  });

  // 更新卡片
  ipcMain.handle('update-card', async (event, id: string, updates: any) => {
    try {
      const success = updateCard(id, updates);
      if (success) {
        console.log(`卡片 ${id} 已更新`);
        return { success: true };
      } else {
        return { success: false, error: '卡片不存在' };
      }
    } catch (error) {
      console.error('更新卡片时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 批量更新卡片
  ipcMain.handle('batch-update-cards', async (event, cards: any[]) => {
    try {
      const result = batchUpdateCards(cards);
      if (result.success) {
        console.log(`批量更新了 ${cards.length} 个卡片`);
      } else {
        console.error('批量更新卡片失败:', result.error);
      }
      return result;
    } catch (error) {
      console.error('批量更新卡片时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 删除卡片
  ipcMain.handle('delete-cards-by-annotation-id', async (event, annotationId: string) => {
    try {
      const success = deleteCardsByAnnotationId(annotationId);
      if (success) {
        console.log(`注释 ${annotationId} 的卡片已删除`);
        return { success: true };
      } else {
        return { success: false, error: '注释不存在' };
      }
    } catch (error) {
      console.error('删除卡片时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 批量删除卡片
  ipcMain.handle('delete-cards', async (event, ids: string[]) => {
    try {
      const success = deleteCards(ids);
      if (success) {
        console.log(`删除了 ${ids.length} 个卡片`);
        return { success: true };
      } else {
        return { success: false, error: '删除失败' };
      }
    } catch (error) {
      console.error('批量删除卡片时出错:', error);
      return { success: false, error: error.message };
    }
  });

  // 更新阅读进度
  ipcMain.handle('update-reading-progress', async (event, bookId: string, progress: string) => {
    try {
      const success = updateReadingProgress(bookId, progress);
      if (success) {
        console.log(`书籍 ${bookId} 的阅读进度已更新: ${progress}`);
        return { success: true };
      } else {
        return { success: false, error: '书籍不存在' };
      }
    } catch (error) {
      console.error('更新阅读进度时出错:', error);
      return { success: false, error: error.message };
    }
  });
}

// 注册EPUB相关的IPC处理器
function registerEpubHandlers() {
  // 读取EPUB文件内容
  ipcMain.handle('read-epub-content', async (event, filePath: string) => {
    console.log('EPUB内容读取请求:', filePath);
    try {
      // 检查文件是否存在
      await fs.promises.access(filePath, fs.constants.F_OK);
      console.log('文件存在，开始解析EPUB...');
      
      // 读取EPUB文件内容
      const epub = new EPub(filePath);
      await epub.parse();
      console.log('EPUB解析完成，章节数量:', epub.flow.length);
      
      // 调试EPUB结构
      console.log('EPUB flow 内容:', JSON.stringify(epub.flow, null, 2));
      console.log('EPUB spine 内容:', JSON.stringify(epub.spine, null, 2));
      console.log('EPUB manifest 内容:', JSON.stringify(epub.manifest, null, 2));
      console.log('EPUB 所有属性:', Object.keys(epub));
      
      // 尝试不同的章节获取方法
      const chapters = [];
      
      // 方法1: 使用 spine (这是EPUB的标准章节顺序)
      if (epub.spine && epub.spine.length > 0) {
        console.log('使用 spine 方法获取章节...');
        for (const item of epub.spine) {
          if (item.id) {
            try {
              console.log('正在读取spine章节:', item.id);
              const content = await new Promise<string>((resolve, reject) => {
                epub.getChapterRaw(item.id, (err, text) => {
                  if (err) reject(err);
                  else resolve(text);
                });
              });
              chapters.push({
                id: item.id,
                title: `Chapter ${chapters.length + 1}`,
                href: '',
                content: content
              });
            } catch (err) {
              console.warn(`无法读取spine章节 ${item.id}:`, err);
            }
          }
        }
      }
      
      // 方法2: 使用 flow
      if (chapters.length === 0 && epub.flow && epub.flow.length > 0) {
        console.log('使用 flow 方法获取章节...');
        for (const chapter of epub.flow) {
          if (chapter.id && chapter.href) {
            try {
              console.log('正在读取章节:', chapter.id, chapter.title);
              const content = await new Promise<string>((resolve, reject) => {
                epub.getChapterRaw(chapter.id, (err, text) => {
                  if (err) reject(err);
                  else resolve(text);
                });
              });
              chapters.push({
                id: chapter.id,
                title: chapter.title || chapter.id,
                href: chapter.href,
                content: content
              });
            } catch (err) {
              console.warn(`无法读取章节 ${chapter.id}:`, err);
            }
          }
        }
      }
      
      // 方法3: 尝试使用目录
      if (chapters.length === 0) {
        console.log('尝试使用目录方法...');
        try {
          const toc = epub.toc || [];
          console.log('目录内容:', JSON.stringify(toc, null, 2));
          
          if (toc && toc.length > 0) {
            for (const item of toc) {
              if (item.id) {
                try {
                  console.log('正在读取目录章节:', item.id, item.title);
                  const content = await new Promise<string>((resolve, reject) => {
                    epub.getChapterRaw(item.id, (err, text) => {
                      if (err) reject(err);
                      else resolve(text);
                    });
                  });
                  chapters.push({
                    id: item.id,
                    title: item.title || item.id,
                    href: item.href || '',
                    content: content
                  });
                } catch (err) {
                  console.warn(`无法读取目录章节 ${item.id}:`, err);
                }
              }
            }
          }
        } catch (err) {
          console.warn('无法获取目录:', err);
        }
      }
      
      // 方法4: 尝试从manifest获取所有HTML文件
      if (chapters.length === 0 && epub.manifest) {
        console.log('尝试从manifest获取章节...');
        try {
          const manifestItems = Object.values(epub.manifest);
          const htmlItems = manifestItems.filter((item) => 
            item['media-type'] === 'application/xhtml+xml' || 
            item.href && item.href.endsWith('.html') ||
            item.href && item.href.endsWith('.xhtml')
          );
          
          console.log('找到HTML项目:', htmlItems.length);
          
          for (const item of htmlItems) {
            if (item.id) {
              try {
                console.log('正在读取manifest章节:', item.id, item.href);
                const content = await new Promise<string>((resolve, reject) => {
                  epub.getChapterRaw(item.id, (err, text) => {
                    if (err) reject(err);
                    else resolve(text);
                  });
                });
                chapters.push({
                  id: item.id,
                  title: item.href || item.id,
                  href: item.href || '',
                  content: content
                });
              } catch (err) {
                console.warn(`无法读取manifest章节 ${item.id}:`, err);
              }
            }
          }
        } catch (err) {
          console.warn('从manifest获取章节失败:', err);
        }
      }
      
      // 方法5: 尝试直接获取所有可能的章节ID
      if (chapters.length === 0) {
        console.log('尝试直接获取章节...');
        try {
          // 尝试一些常见的章节ID
          const possibleIds = ['chapter1', 'chapter-1', 'ch1', 'ch-1', 'section1', 'section-1'];
          
          for (const id of possibleIds) {
            try {
              console.log('尝试读取章节ID:', id);
              const content = await new Promise<string>((resolve, reject) => {
                epub.getChapterRaw(id, (err, text) => {
                  if (err) reject(err);
                  else resolve(text);
                });
              });
              if (content) {
                chapters.push({
                  id: id,
                  title: `Chapter ${id}`,
                  href: '',
                  content: content
                });
              }
            } catch (err) {
              // 忽略错误，继续尝试下一个
            }
          }
        } catch (err) {
          console.warn('直接获取章节失败:', err);
        }
      }
      
      console.log('成功读取章节数量:', chapters.length);
      return {
        success: true,
        metadata: {
          title: epub.metadata.title,
          creator: epub.metadata.creator,
          language: epub.metadata.language,
          identifier: epub.metadata.identifier
        },
        chapters: chapters
      };
    } catch (error) {
      console.error('读取EPUB内容时出错:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  });

  console.log('EPUB IPC处理器已注册');
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// 注册LLM相关的IPC处理器
function registerLlmHandlers() {
  // 书籍摘要生成
  ipcMain.handle('summarize-book', async (event, content: string) => {
    try {
      const summarizeBook = (await import('./main/llm/tools/summarizeBook')).default;
      const summary = await summarizeBook(content);
      console.log('书籍摘要生成成功');
      return summary;
    } catch (error) {
      console.error('书籍摘要生成失败:', error);
      throw error;
    }
  });

  // 文本解释生成
  ipcMain.handle('explain-text', async (event, topic: string, content: string) => {
    try {
      const explain = (await import('./main/llm/tools/explain')).default;
      const explanation = await explain(topic, content);
      console.log('文本解释生成成功');
      return explanation;
    } catch (error) {
      console.error('文本解释生成失败:', error);
      throw error;
    }
  });

  console.log('LLM IPC处理器已注册');
}
