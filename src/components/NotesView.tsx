import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Annotation } from '../types';
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
  direction: 'none' | 'bidirectional' | 'unidirectional';
  description?: string;
}

interface NotesViewProps {
  annotations: Annotation[];
  onCardClick: (annotation: Annotation) => void;
  isVisible: boolean;
  width?: number;
}

const NotesView: React.FC<NotesViewProps> = ({ annotations, onCardClick, isVisible, width = 400 }) => {
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

  // Initialize note cards from annotations
  useEffect(() => {
    const newCards: NoteCard[] = annotations.map((annotation, index) => ({
      id: `card-${annotation.id}`,
      annotation,
      position: { x: 50 + index * 200, y: 50 + index * 150 },
      width: 200,
      height: 120,
    }));
    setNoteCards(newCards);
    
    // Load saved positions and connections from localStorage
    try {
      // Create a more stable key based on all annotation IDs
      const annotationIds = annotations.map(a => a.id).sort().join('-');
      const storageKey = `notes-view-${annotationIds || 'empty'}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.cards) {
          setNoteCards(prev => prev.map(card => {
            const saved = parsed.cards.find((c: any) => c.annotationId === card.annotation.id);
            return saved ? { ...card, position: saved.position } : card;
          }));
        }
        if (parsed.connections) {
          setConnections(parsed.connections);
        }
      }
    } catch (error) {
      console.warn('Failed to load saved notes view data:', error);
    }
  }, [annotations]);

  // Handle card dragging
  const handleMouseDown = useCallback((e: React.MouseEvent, cardId: string) => {
    const card = noteCards.find(c => c.id === cardId);
    if (!card) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDraggedCard(cardId);
    setDragOffset({ x: offsetX, y: offsetY });
  }, [noteCards]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!canvasRef.current) return;

    if (draggedCard) {
      const canvasRect = canvasRef.current.getBoundingClientRect();
      const newX = (e.clientX - canvasRect.left - dragOffset.x + canvasOffset.x) / zoom;
      const newY = (e.clientY - canvasRect.top - dragOffset.y + canvasOffset.y) / zoom;

      setNoteCards(prev => prev.map(card => 
        card.id === draggedCard 
          ? { ...card, position: { x: newX, y: newY } }
          : card
      ));
    } else if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setCanvasOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [draggedCard, dragOffset, canvasOffset, zoom, isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setDraggedCard(null);
    setIsPanning(false);
  }, []);

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
        setConnections(prev => [...prev, newConnection]);
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
    setConnections(prev => prev.map(conn => {
      if (conn.id === connectionId) {
        const directions: Array<'none' | 'bidirectional' | 'unidirectional'> = ['none', 'bidirectional', 'unidirectional'];
        const currentIndex = directions.indexOf(conn.direction);
        const nextIndex = (currentIndex + 1) % directions.length;
        return { ...conn, direction: directions[nextIndex] };
      }
      return conn;
    }));
  };

  // Handle connection description
  const handleConnectionDoubleClick = (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId);
    if (connection) {
      setSelectedConnection(connectionId);
      setConnectionDescription(connection.description || '');
      setShowDescriptionModal(true);
    }
  };

  const saveConnectionDescription = () => {
    if (selectedConnection) {
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

  // Save notes view data to localStorage
  const saveNotesViewData = useCallback(() => {
    if (annotations.length === 0) return;
    
    try {
      const data = {
        cards: noteCards.map(card => ({
          annotationId: card.annotation.id,
          position: card.position,
        })),
        connections,
      };
      // Use the same key generation logic as in the load function
      const annotationIds = annotations.map(a => a.id).sort().join('-');
      const storageKey = `notes-view-${annotationIds}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save notes view data:', error);
    }
  }, [noteCards, connections, annotations]);

  // Save data when cards or connections change
  useEffect(() => {
    saveNotesViewData();
  }, [saveNotesViewData]);

  // Clean up connections when annotations are removed
  useEffect(() => {
    const validCardIds = new Set(noteCards.map(card => card.id));
    setConnections(prev => prev.filter(conn => 
      validCardIds.has(conn.fromCardId) && validCardIds.has(conn.toCardId)
    ));
  }, [noteCards]);

  // Draw connections
  const drawConnections = () => {
    return connections.map(connection => {
      const fromCard = noteCards.find(c => c.id === connection.fromCardId);
      const toCard = noteCards.find(c => c.id === connection.toCardId);
      
      if (!fromCard || !toCard) return null;

      const fromX = fromCard.position.x + fromCard.width / 2;
      const fromY = fromCard.position.y + fromCard.height / 2;
      const toX = toCard.position.x + toCard.width / 2;
      const toY = toCard.position.y + toCard.height / 2;

      const angle = Math.atan2(toY - fromY, toX - fromX);
      const arrowLength = 10;
      const arrowAngle = Math.PI / 6;

      let path = `M ${fromX} ${fromY} L ${toX} ${toY}`;
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
      } else if (connection.direction === 'unidirectional') {
        // Draw arrow at the end
        const arrow1X = toX - Math.cos(angle + arrowAngle) * arrowLength;
        const arrow1Y = toY - Math.sin(angle + arrowAngle) * arrowLength;
        const arrow2X = toX - Math.cos(angle - arrowAngle) * arrowLength;
        const arrow2Y = toY - Math.sin(angle - arrowAngle) * arrowLength;
        
        arrowPath = `M ${arrow1X} ${arrow1Y} L ${toX} ${toY} L ${arrow2X} ${arrow2Y}`;
      }

      return (
        <g key={connection.id}>
          <path
            d={path}
            stroke="#666"
            strokeWidth="2"
            fill="none"
            onDoubleClick={() => handleConnectionDoubleClick(connection.id)}
            onContextMenu={(e) => handleConnectionRightClick(e, connection.id)}
            style={{ cursor: 'pointer' }}
          />
          {arrowPath && (
            <path
              d={arrowPath}
              stroke="#666"
              strokeWidth="2"
              fill="none"
            />
          )}
          {connection.description && (
            <text
              x={(fromX + toX) / 2}
              y={(fromY + toY) / 2 - 10}
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
            onClick={() => setConnections([])}
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
          <svg className="connections-layer" width="100%" height="100%">
            {drawConnections()}
          </svg>
          
          {noteCards.map(card => (
            <div
              key={card.id}
              className={`note-card ${connectionStart === card.id ? 'connection-start' : ''}`}
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
