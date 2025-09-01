"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getRealtimeClient } from "../../lib/realtime/provider";

interface DrawingEvent {
  type: "start" | "draw" | "end";
  x: number;
  y: number;
  color: string;
  lineWidth: number;
  userId: string;
  timestamp: number;
}

interface WhiteboardProps {
  roomId: string;
  userId: string;
  userName: string;
  width?: number;
  height?: number;
}

const COLORS = [
  "#000000", "#FF0000", "#00FF00", "#0000FF", 
  "#FFFF00", "#FF00FF", "#00FFFF", "#FFA500",
  "#800080", "#FFC0CB", "#A52A2A", "#808080"
];

const LINE_WIDTHS = [2, 4, 8, 12, 16];

export default function CollaborativeWhiteboard({
  roomId,
  userId,
  userName,
  width = 800,
  height = 600
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState("#000000");
  const [currentLineWidth, setCurrentLineWidth] = useState(4);
  const [tool, setTool] = useState<"pen" | "eraser" | "text">("pen");
  const [showToolbar, setShowToolbar] = useState(true);
  const [isCollaborativeMode, setIsCollaborativeMode] = useState(true);
  
  const rt = getRealtimeClient();
  const drawingData = useRef<DrawingEvent[]>([]);

  // Obtenir le contexte du canvas
  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext("2d") || null;
  }, []);

  // Dessiner un point
  const drawPoint = useCallback((x: number, y: number, color: string, lineWidth: number, isStart = false) => {
    const ctx = getContext();
    if (!ctx) return;

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (isStart) {
      ctx.beginPath();
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  }, [getContext]);

  // Gérer le début du dessin
  const startDrawing = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    const event: DrawingEvent = {
      type: "start",
      x,
      y,
      color: tool === "eraser" ? "#FFFFFF" : currentColor,
      lineWidth: tool === "eraser" ? currentLineWidth * 2 : currentLineWidth,
      userId,
      timestamp: Date.now()
    };

    drawingData.current.push(event);
    drawPoint(x, y, event.color, event.lineWidth, true);

    // Envoyer en temps réel si mode collaboratif
    if (isCollaborativeMode) {
      rt.trigger(roomId, "whiteboard_draw", event);
    }
  }, [canvasRef, currentColor, currentLineWidth, tool, userId, roomId, rt, isCollaborativeMode, drawPoint]);

  // Gérer le dessin
  const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const event: DrawingEvent = {
      type: "draw",
      x,
      y,
      color: tool === "eraser" ? "#FFFFFF" : currentColor,
      lineWidth: tool === "eraser" ? currentLineWidth * 2 : currentLineWidth,
      userId,
      timestamp: Date.now()
    };

    drawingData.current.push(event);
    drawPoint(x, y, event.color, event.lineWidth);

    // Envoyer en temps réel si mode collaboratif
    if (isCollaborativeMode) {
      rt.trigger(roomId, "whiteboard_draw", event);
    }
  }, [isDrawing, canvasRef, currentColor, currentLineWidth, tool, userId, roomId, rt, isCollaborativeMode, drawPoint]);

  // Arrêter le dessin
  const stopDrawing = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    const event: DrawingEvent = {
      type: "end",
      x: 0,
      y: 0,
      color: currentColor,
      lineWidth: currentLineWidth,
      userId,
      timestamp: Date.now()
    };

    drawingData.current.push(event);

    // Envoyer en temps réel si mode collaboratif
    if (isCollaborativeMode) {
      rt.trigger(roomId, "whiteboard_draw", event);
    }
  }, [isDrawing, currentColor, currentLineWidth, userId, roomId, rt, isCollaborativeMode]);

  // Vider le tableau
  const clearCanvas = useCallback(() => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    drawingData.current = [];

    // Notifier le clear en temps réel
    if (isCollaborativeMode) {
      rt.trigger(roomId, "whiteboard_clear", {
        userId,
        userName,
        timestamp: Date.now()
      });
    }
  }, [getContext, canvasRef, userId, userName, roomId, rt, isCollaborativeMode]);

  // Sauvegarder le tableau
  const saveCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const link = document.createElement("a");
    link.download = `whiteboard-${roomId}-${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL();
    link.click();
  }, [canvasRef, roomId]);

  // Charger les données de dessin
  const loadDrawingData = useCallback((events: DrawingEvent[]) => {
    const ctx = getContext();
    if (!ctx || !canvasRef.current) return;

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    let currentPath: { x: number; y: number }[] = [];
    let currentStyle = { color: "#000000", lineWidth: 4 };

    events.forEach(event => {
      if (event.type === "start") {
        currentPath = [{ x: event.x, y: event.y }];
        currentStyle = { color: event.color, lineWidth: event.lineWidth };
      } else if (event.type === "draw") {
        currentPath.push({ x: event.x, y: event.y });
      } else if (event.type === "end" && currentPath.length > 0) {
        // Redessiner le chemin complet
        ctx.strokeStyle = currentStyle.color;
        ctx.lineWidth = currentStyle.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        
        currentPath.forEach((point, index) => {
          if (index === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        });
        
        ctx.stroke();
        currentPath = [];
      }
    });
  }, [getContext, canvasRef]);

  // Écouter les événements de dessin collaboratif
  useEffect(() => {
    const unsubscribeDraw = rt.subscribe(roomId, "whiteboard_draw", (event: DrawingEvent) => {
      if (event.userId !== userId) {
        drawingData.current.push(event);
        
        if (event.type === "start") {
          drawPoint(event.x, event.y, event.color, event.lineWidth, true);
        } else if (event.type === "draw") {
          drawPoint(event.x, event.y, event.color, event.lineWidth);
        }
      }
    });

    const unsubscribeClear = rt.subscribe(roomId, "whiteboard_clear", (data: any) => {
      if (data.userId !== userId) {
        const ctx = getContext();
        if (ctx && canvasRef.current) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          drawingData.current = [];
        }
      }
    });

    return () => {
      unsubscribeDraw();
      unsubscribeClear();
    };
  }, [roomId, userId, rt, drawPoint, getContext, canvasRef]);

  return (
    <div className="collaborative-whiteboard bg-white border border-gray-300 rounded-lg overflow-hidden">
      {/* Barre d'outils */}
      {showToolbar && (
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            {/* Outils */}
            <div className="flex gap-2">
              <button
                onClick={() => setTool("pen")}
                className={`px-3 py-1 rounded text-sm ${
                  tool === "pen" ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
              >
                ✏️ Crayon
              </button>
              <button
                onClick={() => setTool("eraser")}
                className={`px-3 py-1 rounded text-sm ${
                  tool === "eraser" ? "bg-blue-500 text-white" : "bg-gray-200"
                }`}
              >
                🧹 Gomme
              </button>
            </div>

            {/* Couleurs */}
            <div className="flex gap-1">
              {COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setCurrentColor(color)}
                  className={`w-6 h-6 rounded border-2 ${
                    currentColor === color ? "border-gray-800" : "border-gray-300"
                  }`}
                  style={{ backgroundColor: color }}
                  title={`Couleur ${color}`}
                />
              ))}
            </div>

            {/* Tailles */}
            <div className="flex gap-1">
              {LINE_WIDTHS.map(width => (
                <button
                  key={width}
                  onClick={() => setCurrentLineWidth(width)}
                  className={`px-2 py-1 rounded text-xs ${
                    currentLineWidth === width ? "bg-blue-500 text-white" : "bg-gray-200"
                  }`}
                >
                  {width}px
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode collaboratif */}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isCollaborativeMode}
                onChange={(e) => setIsCollaborativeMode(e.target.checked)}
              />
              Collaboratif
            </label>

            {/* Actions */}
            <button
              onClick={clearCanvas}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              🗑️ Effacer
            </button>
            <button
              onClick={saveCanvas}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              💾 Sauvegarder
            </button>
            <button
              onClick={() => setShowToolbar(false)}
              className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              ▼
            </button>
          </div>
        </div>
      )}

      {/* Bouton pour réafficher la toolbar */}
      {!showToolbar && (
        <button
          onClick={() => setShowToolbar(true)}
          className="absolute top-2 right-2 px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 z-10"
        >
          ▲ Outils
        </button>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="cursor-crosshair"
          style={{ 
            cursor: tool === "eraser" ? "crosshair" : "crosshair",
            touchAction: "none"
          }}
        />
        
        {/* Indicateur de mode */}
        <div className="absolute bottom-2 left-2 text-xs bg-black bg-opacity-50 text-white px-2 py-1 rounded">
          {tool === "pen" && `✏️ Crayon ${currentColor} ${currentLineWidth}px`}
          {tool === "eraser" && `🧹 Gomme ${currentLineWidth * 2}px`}
          {isCollaborativeMode && " • 🌐 Collaboratif"}
        </div>
      </div>
    </div>
  );
}
