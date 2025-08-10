import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Annotation, NoteConnection } from '../types';
import './NotesView.css';

interface NoteCard {
  id: string;
  annotation: Annotation;
  position: { x: number; y: number };
  width: number;
  height: number;
}

interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
  direction: 'none' | 'bidirectional' | 'unidirectional-forward' | 'unidirectional-backward';
  description?: string;
}

interface NotesViewProps {
  annotations: Annotation[];
  onCardClick: (annotation: Annotation) => void;
  isVisible: boolean;
  width?: number;
  bookId: string;
}

const NotesView: React.FC<NotesViewProps> = ({ annotations, onCardClick, isVisible, width = 400, bookId }) => {
  const [noteCards, setNoteCards] = useState<NoteCard[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [connectionDescription, setConnectionDescription] = useState('');
  const [showDescriptionModal, setShowDescriptionModal] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dragStartPosition, setDragStartPosition] = useState({ x: 0, y: 0 });
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isUserAction = useRef(false);

  // Load connections from database
  const loadConnections = useCallback(async () => {
    try {
      console.log('Loading connections for bookId:', bookId);
      setIsLoadingConnections(true);
      const electron = (window as any).electron;
      if (electron && electron.db) {
        const dbConnections = await electron.db.getNoteConnectionsByBookId(bookId);
        console.log('Loaded connections from database:', dbConnections);
        // Convert database connections to component format
        const componentConnections: Connection[] = dbConnections.map((dbConn: NoteConnection) => ({
          id: dbConn.id,
          fromCardId: `card-${dbConn.fromAnnotationId}`,
          toCardId: `card-${dbConn.toAnnotationId}`,
          direction: dbConn.direction,
          description: dbConn.description
        }));
        console.log('Converted to component connections:', componentConnections);
        setConnections(componentConnections);
      } else {
        console.warn('Electron or electron.db not available');
      }
    } catch (error) {
      console.warn('Failed to load connections from database:', error);
    } finally {
      setIsLoadingConnections(false);
      setHasInitialized(true);
    }
  }, [bookId]);

  // Save connections to database
  const saveConnections = useCallback(async (newConnections: Connection[]) => {
    try {
      console.log('Saving connections for bookId:', bookId, 'connections:', newConnections);
      const electron = (window as any).electron;
      if (electron && electron.db) {
        // Convert component connections to database format
        const dbConnections: NoteConnection[] = newConnections.map(conn => ({
          id: conn.id,
          bookId,
          fromAnnotationId: conn.fromCardId.replace('card-', ''),
          toAnnotationId: conn.toCardId.replace('card-', ''),
          direction: conn.direction,
          description: conn.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }));
        
        console.log('Saving to database:', dbConnections);
        const result = await electron.db.batchUpdateNoteConnections(bookId, dbConnections);
        console.log('Save result:', result);
      } else {
        console.warn('Electron or electron.db not available for saving');
      }
    } catch (error) {
      console.warn('Failed to save connections to database:', error);
    }
  }, [bookId]);

  // Save annotation visual properties to database
  const saveAnnotationVisuals = useCallback(async (updatedCards: NoteCard[]) => {
    try {
      console.log('Saving annotation visuals for bookId:', bookId, 'cards:', updatedCards.length);
      const electron = (window as any).electron;
      if (electron && electron.db) {
        const annotationsToUpdate = updatedCards.map(card => ({
          id: card.annotation.id,
          position: card.position,
          width: card.width,
          height: card.height
        }));
        
        console.log('Saving to database:', annotationsToUpdate);
        const result = await electron.db.batchUpdateAnnotationVisuals(bookId, annotationsToUpdate);
        console.log('Save result:', result);
      } else {
        console.warn('Electron or electron.db not available for saving annotation visuals');
      }
    } catch (error) {
      console.warn('Failed to save annotation visuals to database:', error);
    }
  }, [bookId]);

  // Initialize note cards from annotations
  useEffect(() => {
    const newCards: NoteCard[] = annotations.map((annotation, index) => ({
      id: `card-${annotation.id}`,
      annotation,
      position: annotation.position || { x: 50 + index * 200, y: 50 + index * 150 },
      width: annotation.width || 200,
      height: annotation.height || 120,
    }));
    setNoteCards(newCards);
  }, [annotations]);

  // Load connections from database when annotations or bookId changes
  useEffect(() => {
    console.log('loadConnections useEffect triggered with annotations:', annotations.length, 'bookId:', bookId);
    if (annotations.length > 0) {
      setHasInitialized(false); // Reset initialization state
      loadConnections();
    }
  }, [annotations, bookId, loadConnections]);



  // Handle card dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    const card = noteCards.find(c => c.id === cardId);
    if (!card) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedCard(cardId);
    setDragOffset({ x: offsetX, y: offsetY });
    setDragStartPosition({ x: e.clientX, y: e.clientY });
    
    // Start in regular drag mode, will switch to connecting if we detect overlap
    setIsConnecting(false);
  }, [noteCards]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;

    if (draggedCard) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left - dragOffset.x + canvasOffset.x) / zoom;
      const newY = (e.clientY - canvasRect.top - dragOffset.y + canvasOffset.y) / zoom;

      // Always update the card position for smooth dragging
      setNoteCards(prev => prev.map(card => 
        card.id === draggedCard 
          ? { ...card, position: { x: newX, y: newY } }
          : card
      ));

      // Check for overlapping cards to determine if we should switch to connecting mode
      // Use the updated card data for overlap detection
      const draggedCardData = { ...noteCards.find(c => c.id === draggedCard)!, position: { x: newX, y: newY } };
      if (draggedCardData) {
        const draggedRect = {
          left: newX,
          top: newY,
          right: newX + draggedCardData.width,
          bottom: newY + draggedCardData.height,
        };

        let foundOverlap = false;
        noteCards.forEach(card => {
          if (card.id !== draggedCard) {
            const cardRect = {
              left: card.position.x,
              top: card.position.y,
              right: card.position.x + card.width,
              bottom: card.position.y + card.height,
            };

            // Check if rectangles overlap
            if (draggedRect.left < cardRect.right && 
                draggedRect.right > cardRect.left && 
                draggedRect.top < cardRect.bottom && 
                draggedRect.bottom > cardRect.top) {
              setHoveredCard(card.id);
              foundOverlap = true;
              
              // Switch to connecting mode if we detect overlap
              if (!isConnecting) {
                setIsConnecting(true);
              }
            }
          }
        });

        if (!foundOverlap) {
          setHoveredCard(null);
        }
      }
    } else if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedCard, dragOffset, canvasOffset, zoom, isPanning, panStart, isConnecting, noteCards]);

  const handleMouseUp = useCallback(() => {
    // Create connection if hovering over another card
    if (isConnecting && hoveredCard && draggedCard) {
      const newConnection: Connection = {
        id: `conn-${Date.now()}`,
        fromCardId: draggedCard,
        toCardId: hoveredCard,
        direction: 'none',
      };
      console.log('Creating connection via drag:', newConnection);
      isUserAction.current = true; // Mark as user action
      setConnections(prev => {
        const newConnections = [...prev, newConnection];
        console.log('Updated connections:', newConnections);
        return newConnections;
      });

      // Brief visual feedback for successful connection
      setTimeout(() => {
        setHoveredCard(null);
      }, 200);
    } else {
      setHoveredCard(null);
    }

    // Save position changes to database if a card was dragged
    if (draggedCard) {
      saveAnnotationVisuals(noteCards);
    }

    setDraggedCard(null);
    setIsPanning(false);
    setIsConnecting(false);
  }, [isConnecting, hoveredCard, draggedCard, saveAnnotationVisuals, noteCards]);

  useEffect(() => {
    if (draggedCard) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedCard, handleMouseMove, handleMouseUp]);

  // Handle connection creation
  const [connectionStart, setConnectionStart] = useState<string | null>(null);

  const handleCardMouseDown = (e: React.MouseEvent, cardId: string) => {
    if (e.button === 2) { // Right click
      e.preventDefault();
      if (!connectionStart) {
        setConnectionStart(cardId);
      } else if (connectionStart !== cardId) {
        // Create connection
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          fromCardId: connectionStart,
          toCardId: cardId,
          direction: 'none',
        };
        console.log('Creating connection via right-click:', newConnection);
        isUserAction.current = true; // Mark as user action
        setConnections(prev => {
          const newConnections = [...prev, newConnection];
          console.log('Updated connections:', newConnections);
          return newConnections;
        });
        setConnectionStart(null);
      } else {
        // Clicking the same card again cancels the connection
        setConnectionStart(null);
      }
    }
  };

  // Handle canvas panning
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) { // Middle click or Ctrl+left click
      e.preventDefault();
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.5, Math.min(2, zoom * delta));
      setZoom(newZoom);
    }
  };

  // Handle connection direction change
  const handleConnectionRightClick = (e: React.MouseEvent, connectionId: string) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Right-clicked connection:', connectionId);
    isUserAction.current = true; // Mark as user action
    setConnections(prev => prev.map(conn => {
      if (conn.id === connectionId) {
        const directions: Array<'none' | 'bidirectional' | 'unidirectional-forward' | 'unidirectional-backward'> = [
          'none', 
          'unidirectional-forward', 
          'unidirectional-backward', 
          'bidirectional'
        ];
        const currentIndex = directions.indexOf(conn.direction);
        const nextIndex = (currentIndex + 1) % directions.length;
        return { ...conn, direction: directions[nextIndex] };
      }
      return conn;
    }));
  };

  // Handle connection description
  const handleConnectionDoubleClick = (connectionId: string) => {
    console.log('Double-clicked connection:', connectionId);
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      setSelectedConnection(connectionId);
      setConnectionDescription(connection.description || '');
      setShowDescriptionModal(true);
    }
  };

  const saveConnectionDescription = () => {
    if (selectedConnection) {
      isUserAction.current = true; // Mark as user action
      setConnections(prev => prev.map(conn => 
        conn.id === selectedConnection 
          ? { ...conn, description: connectionDescription }
          : conn
      ));
      setShowDescriptionModal(false);
      setSelectedConnection(null);
      setConnectionDescription('');
    }
  };

  // Clean up connections when annotations are removed
  useEffect(() => {
    const validCardIds = new Set(noteCards.map(card => card.id));
    const filteredConnections = connections.filter(conn => 
      validCardIds.has(conn.fromCardId) && validCardIds.has(conn.toCardId)
    );
    
    // Only update if connections were actually filtered out
    if (filteredConnections.length !== connections.length) {
      isUserAction.current = true; // Mark as user action since connections were removed
      setConnections(filteredConnections);
    }
  }, [noteCards, connections]);

  // Save connections to database when connections change
  useEffect(() => {
    if (annotations.length === 0 || isLoadingConnections || !hasInitialized) return;
    
    // Only save if this is a user action (not during initial load)
    if (isUserAction.current) {
      console.log('Saving connections to database (user action):', connections);
      saveConnections(connections);
      isUserAction.current = false; // Reset the flag
    }
  }, [connections, annotations, saveConnections, isLoadingConnections, hasInitialized]);

  // Draw connections
  const drawConnections = () => {
    return connections.map(connection => {
      const fromCard = noteCards.find(c => c.id === connection.fromCardId);
      const toCard = noteCards.find(c => c.id === connection.toCardId);
      
      if (!fromCard || !toCard) return null;

      // Calculate center points
      const fromCenterX = fromCard.position.x + fromCard.width / 2;
      const fromCenterY = fromCard.position.y + fromCard.height / 2;
      const toCenterX = toCard.position.x + toCard.width / 2;
      const toCenterY = toCard.position.y + toCard.height / 2;

      // Calculate angle between centers
      const angle = Math.atan2(toCenterY - fromCenterY, toCenterX - fromCenterX);
      
      // Calculate intersection points with card edges
      const fromX = fromCenterX + Math.cos(angle) * (fromCard.width / 2);
      const fromY = fromCenterY + Math.sin(angle) * (fromCard.height / 2);
      const toX = toCenterX - Math.cos(angle) * (toCard.width / 2);
      const toY = toCenterY - Math.sin(angle) * (toCard.height / 2);

      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;

      const path = `M ${fromX} ${fromY} L ${toX} ${toY}`;
      let arrowPath = '';

      if (connection.direction === 'bidirectional') {
        // Draw arrows at both ends
        const arrow1X = fromX + Math.cos(angle + arrowAngle) * arrowLength;
        const arrow1Y = fromY + Math.sin(angle + arrowAngle) * arrowLength;
        const arrow2X = fromX + Math.cos(angle - arrowAngle) * arrowLength;
        const arrow2Y = fromY + Math.sin(angle - arrowAngle) * arrowLength;
        const arrow3X = toX - Math.cos(angle + arrowAngle) * arrowLength;
        const arrow3Y = toY - Math.sin(angle + arrowAngle) * arrowLength;
        const arrow4X = toX - Math.cos(angle - arrowAngle) * arrowLength;
        const arrow4Y = toY - Math.sin(angle - arrowAngle) * arrowLength;
        
        arrowPath = `M ${arrow1X} ${arrow1Y} L ${fromX} ${fromY} L ${arrow2X} ${arrow2Y} M ${arrow3X} ${arrow3Y} L ${toX} ${toY} L ${arrow4X} ${arrow4Y}`;
      } else if (connection.direction === 'unidirectional-forward') {
        // Draw arrow pointing from source to target (forward direction)
        const arrow1X = toX - Math.cos(angle + arrowAngle) * arrowLength;
        const arrow1Y = toY - Math.sin(angle + arrowAngle) * arrowLength;
        const arrow2X = toX - Math.cos(angle - arrowAngle) * arrowLength;
        const arrow2Y = toY - Math.sin(angle - arrowAngle) * arrowLength;
        
        arrowPath = `M ${arrow1X} ${arrow1Y} L ${toX} ${toY} L ${arrow2X} ${arrow2Y}`;
      } else if (connection.direction === 'unidirectional-backward') {
        // Draw arrow pointing from target back to source (backward direction)
        const arrow1X = fromX + Math.cos(angle + arrowAngle) * arrowLength;
        const arrow1Y = fromY + Math.sin(angle + arrowAngle) * arrowLength;
        const arrow2X = fromX + Math.cos(angle - arrowAngle) * arrowLength;
        const arrow2Y = fromY + Math.sin(angle - arrowAngle) * arrowLength;
        
        arrowPath = `M ${arrow1X} ${arrow1Y} L ${fromX} ${fromY} L ${arrow2X} ${arrow2Y}`;
      }

                           return (
          <g key={connection.id}>
            {/* Invisible wider stroke for easier interaction */}
            <path
              d={path}
              stroke="transparent"
              strokeWidth="12"
              fill="none"
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleConnectionDoubleClick(connection.id);
              }}
              onContextMenu={(e) => handleConnectionRightClick(e, connection.id)}
              style={{ cursor: 'pointer', pointerEvents: 'auto' }}
            />
            {/* Visible thin stroke */}
            <path
              d={path}
              stroke="#666"
              strokeWidth="2"
              fill="none"
              style={{ pointerEvents: 'none' }}
            />
            {arrowPath && (
              <>
                {/* Invisible wider stroke for arrow interaction */}
                <path
                  d={arrowPath}
                  stroke="transparent"
                  strokeWidth="12"
                  fill="none"
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleConnectionDoubleClick(connection.id);
                  }}
                  onContextMenu={(e) => handleConnectionRightClick(e, connection.id)}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                />
                {/* Visible thin stroke for arrows */}
                <path
                  d={arrowPath}
                  stroke="#666"
                  strokeWidth="2"
                  fill="none"
                  style={{ pointerEvents: 'none' }}
                />
              </>
            )}
                     {connection.description && (
             <text
               x={(fromCenterX + toCenterX) / 2}
               y={(fromCenterY + toCenterY) / 2 - 10}
               textAnchor="middle"
               fontSize="12"
               fill="#333"
               pointerEvents="none"
             >
               {connection.description}
             </text>
           )}
        </g>
      );
    });
  };

  if (!isVisible) return null;

  return (
    <div className="notes-view" style={{ width: `${width}px` }}>
      <div className="notes-header">
        <h3>Notes View</h3>
        <div className="notes-controls">
          <div className="zoom-controls">
            <button 
              className="zoom-btn"
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
              title="Zoom Out"
            >
              -
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button 
              className="zoom-btn"
              onClick={() => setZoom(prev => Math.min(2, prev + 0.1))}
              title="Zoom In"
            >
              +
            </button>
          </div>
          <button 
            className="clear-connections-btn"
            onClick={() => {
              isUserAction.current = true; // Mark as user action
              setConnections([]);
            }}
          >
            Clear Connections
          </button>
        </div>
             </div>
       <div className="notes-instructions">
         <p>💡 <strong>Instructions:</strong></p>
         <ul>
           <li>Click cards to navigate to notes in the reader</li>
           <li>Drag cards to reposition them</li>
           <li>Drag a card over another card to connect them</li>
           <li>Right-click two cards to connect them</li>
           <li>Right-click connections to change direction</li>
           <li>Double-click connections to add descriptions</li>
           <li>Ctrl+scroll to zoom, Ctrl+drag to pan</li>
         </ul>
       </div>
       
       <div 
         className="notes-canvas" 
         ref={canvasRef}
         onMouseDown={handleCanvasMouseDown}
         onWheel={handleWheel}
       >
        <div 
          className="canvas-content"
          style={{
            transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
                     <svg className="connections-layer" width="100%" height="100%" style={{ pointerEvents: 'none' }}>
             {drawConnections()}
           </svg>
          
                     {noteCards.map(card => (
             <div
               key={card.id}
               className={`note-card ${connectionStart === card.id ? 'connection-start' : ''} ${hoveredCard === card.id ? 'connection-target' : ''} ${isConnecting && draggedCard === card.id ? 'connecting' : ''}`}
               style={{
                 left: card.position.x,
                 top: card.position.y,
                 width: card.width,
                 height: card.height,
               }}
               onMouseDown={(e) => {
                 handleMouseDown(e, card.id);
                 handleCardMouseDown(e, card.id);
               }}
               onClick={() => onCardClick(card.annotation)}
             >
            <div className="card-header">
              <span className="card-title">Note</span>
              <span className="card-date">
                {new Date(card.annotation.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="card-content">
              <div className="selected-text">
                "{card.annotation.text.substring(0, 50)}..."
              </div>
              <div className="note-text">
                {card.annotation.note}
              </div>
                         </div>
           </div>
         ))}
         </div>
       </div>

      {/* Connection Description Modal */}
      {showDescriptionModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4>Add Connection Description</h4>
            <textarea
              value={connectionDescription}
              onChange={(e) => setConnectionDescription(e.target.value)}
              placeholder="Enter connection description..."
              rows={3}
            />
            <div className="modal-actions">
              <button onClick={saveConnectionDescription}>Save</button>
              <button onClick={() => setShowDescriptionModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesView;
