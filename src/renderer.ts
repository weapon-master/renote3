/**
 * This file will automatically be loaded by vite and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.ts` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

console.log('👋 This message is being logged by "renderer.ts", included via Vite');

// Sample book data
interface Book {
  id: string;
  title: string;
  coverPath?: string;
  filePath: string;
}

class BookShelfManager {
  private books: Book[] = [];
  private bookShelfElement: HTMLElement;
  private readerElement: HTMLElement;
  private booksContainer: HTMLElement;
  private readerContent: HTMLElement;
  private readerTitle: HTMLElement;
  private draggedBook: HTMLElement | null = null;

  constructor() {
    this.bookShelfElement = document.getElementById('book-shelf')!;
    this.readerElement = document.getElementById('reader')!;
    this.booksContainer = document.getElementById('books-container')!;
    this.readerContent = document.getElementById('reader-content')!;
    this.readerTitle = document.getElementById('reader-title')!;

    this.initializeEventListeners();
    this.loadSampleBooks();
    this.renderBooks();
  }

  private initializeEventListeners() {
    // Import button
    const importBtn = document.getElementById('import-btn');
    if (importBtn) {
      importBtn.addEventListener('click', () => this.importBooks());
    }

    // Back button in reader
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => this.showBookShelf());
    }

    // Listen for IPC messages from the main process
    if ((window as any).electron) {
      (window as any).electron.ipcRenderer.on('import-books-result', (books: Book[]) => {
        this.addImportedBooks(books);
      });
    }
  }

  private loadSampleBooks() {
    // Load sample books for demonstration
    this.books = [
      {
        id: '1',
        title: 'Sample Book 1',
        filePath: '/path/to/sample1.epub'
      },
      {
        id: '2',
        title: 'Sample Book 2',
        filePath: '/path/to/sample2.pdf'
      },
      {
        id: '3',
        title: 'Sample Book 3',
        filePath: '/path/to/sample3.epub'
      }
    ];
  }

  private renderBooks() {
    this.booksContainer.innerHTML = '';
    
    this.books.forEach((book, index) => {
      const bookElement = this.createBookElement(book, index);
      this.booksContainer.appendChild(bookElement);
    });
    
    this.initializeDragAndDrop();
  }

  private createBookElement(book: Book, index: number): HTMLElement {
    const bookElement = document.createElement('div');
    bookElement.className = 'book';
    bookElement.dataset.id = book.id;
    bookElement.dataset.index = index.toString();

    // Book cover (placeholder or actual cover)
    const coverElement = document.createElement('div');
    coverElement.className = 'book-cover';
    
    if (book.coverPath) {
      // If we have an actual cover path, display it
      coverElement.innerHTML = `<img src="${book.coverPath}" alt="${book.title}">`;
    } else {
      // Use a placeholder with the first letter of the title
      coverElement.innerHTML = `<div class="book-cover-placeholder">${book.title.charAt(0)}</div>`;
    }

    // Book title
    const titleElement = document.createElement('p');
    titleElement.className = 'book-title';
    titleElement.textContent = book.title;

    // Book actions
    const actionsElement = document.createElement('div');
    actionsElement.className = 'book-actions';
    
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.deleteBook(book.id);
    });
    
    const editBtn = document.createElement('button');
    editBtn.textContent = '✏';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.editBookTitle(book.id);
    });
    
    actionsElement.appendChild(editBtn);
    actionsElement.appendChild(deleteBtn);

    // Add event listener for opening the reader
    bookElement.addEventListener('dblclick', () => this.openReader(book));

    bookElement.appendChild(coverElement);
    bookElement.appendChild(titleElement);
    bookElement.appendChild(actionsElement);

    return bookElement;
  }

  private initializeDragAndDrop() {
    const bookElements = this.booksContainer.querySelectorAll('.book');
    
    bookElements.forEach(bookElement => {
      // Make books draggable
      bookElement.setAttribute('draggable', 'true');
      
      // Drag start event
      bookElement.addEventListener('dragstart', (e) => {
        this.draggedBook = bookElement;
        bookElement.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      });
      
      // Drag end event
      bookElement.addEventListener('dragend', () => {
        bookElement.classList.remove('dragging');
        this.booksContainer.querySelectorAll('.book').forEach(el => {
          el.classList.remove('drag-over');
        });
      });
      
      // Drag over event
      bookElement.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer!.dropEffect = 'move';
      });
      
      // Drag enter event
      bookElement.addEventListener('dragenter', (e) => {
        e.preventDefault();
        if (bookElement !== this.draggedBook) {
          bookElement.classList.add('drag-over');
        }
      });
      
      // Drag leave event
      bookElement.addEventListener('dragleave', () => {
        bookElement.classList.remove('drag-over');
      });
      
      // Drop event
      bookElement.addEventListener('drop', (e) => {
        e.preventDefault();
        bookElement.classList.remove('drag-over');
        
        if (this.draggedBook && this.draggedBook !== bookElement) {
          this.reorderBooks(this.draggedBook, bookElement);
        }
      });
    });
  }

  private reorderBooks(draggedBook: HTMLElement, targetBook: HTMLElement) {
    const draggedIndex = parseInt(draggedBook.dataset.index!);
    const targetIndex = parseInt(targetBook.dataset.index!);
    
    // Reorder books array
    const [movedBook] = this.books.splice(draggedIndex, 1);
    this.books.splice(targetIndex, 0, movedBook);
    
    // Re-render books
    this.renderBooks();
  }

  private importBooks() {
    // Use Electron's IPC to show the file dialog in the main process
    if ((window as any).electron) {
      (window as any).electron.ipcRenderer.send('import-books');
    } else {
      // Fallback for demonstration without Electron
      const newBook: Book = {
        id: Date.now().toString(),
        title: `New Book ${this.books.length + 1}`,
        filePath: `/path/to/newbook${this.books.length + 1}.epub`
      };
      
      this.books.push(newBook);
      this.renderBooks();
    }
  }

  private addImportedBooks(books: Book[]) {
    this.books = [...this.books, ...books];
    this.renderBooks();
  }

  private deleteBook(bookId: string) {
    this.books = this.books.filter(book => book.id !== bookId);
    this.renderBooks();
  }

  private editBookTitle(bookId: string) {
    const book = this.books.find(b => b.id === bookId);
    if (book) {
      const newTitle = prompt('Enter new title:', book.title);
      if (newTitle !== null) {
        book.title = newTitle;
        this.renderBooks();
      }
    }
  }

  private openReader(book: Book) {
    this.readerTitle.textContent = book.title;
    // In a real implementation, this would load the book content
    this.readerContent.innerHTML = `<p>Book content for "${book.title}" would be displayed here.</p>
                                    <p>File path: ${book.filePath}</p>`;
    this.showReader();
  }

  private showBookShelf() {
    this.readerElement.classList.add('hidden');
    this.bookShelfElement.classList.remove('hidden');
  }

  private showReader() {
    this.bookShelfElement.classList.add('hidden');
    this.readerElement.classList.remove('hidden');
  }
}

// Initialize the book shelf when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BookShelfManager();
});
