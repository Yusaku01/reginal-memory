"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";

// Define a proper interface for the Leaflet Map
interface LeafletMapInterface {
  setView: (center: [number, number], zoom: number) => any;
  remove: () => void;
  addLayer: (layer: any) => any;
  // Add other methods as needed
}

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  initialCenter: [number, number];
  initialZoom: number;
  city: string;
}

const MapClient = React.forwardRef<HTMLDivElement, MapProps>(
  ({ className, initialCenter, initialZoom, city, ...props }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const leafletMapRef = useRef<LeafletMapInterface | null>(null);

    const { toast } = useToast();

    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingTool, setDrawingTool] = useState<"pen" | "text" | "eraser" | "shape">(
      "pen"
    );
    const [penColor, setPenColor] = useState("#000000");
    const [penSize, setPenSize] = useState(5);
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
    const [textInput, setTextInput] = useState("");
    const [textPosition, setTextPosition] = useState<{
      x: number;
      y: number;
    } | null>(null);

    // Drawing history for undo/redo
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Shape drawing state
    const [drawingShape, setDrawingShape] = useState<"circle" | "rectangle" | "triangle" | "arrow" | null>(null);
    const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

    // Initialize map
    useEffect(() => {
      // We need to import Leaflet dynamically because it depends on the window object
      const initializeMap = async () => {
        if (mapRef.current && !leafletMapRef.current) {
          // Import dynamically to avoid SSR issues
          const L = await import("leaflet");

          const map = L.map(mapRef.current).setView(initialCenter, initialZoom);

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);

          leafletMapRef.current = map as LeafletMapInterface;

          // Save initial state after map is loaded
          setTimeout(() => {
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext("2d");
              if (ctx) {
                try {
                  const imageData = ctx.getImageData(
                    0,
                    0,
                    canvasRef.current.width,
                    canvasRef.current.height
                  );
                  setHistory([imageData]);
                  setHistoryIndex(0);
                } catch (error) {
                  console.error("Failed to get initial image data:", error);
                }
              }
            }
          }, 100); // Small delay to ensure canvas is ready
        }
      };

      initializeMap().catch((error) => {
        console.error("Failed to initialize map:", error);
      });

      return () => {
        if (leafletMapRef.current) {
          leafletMapRef.current.remove();
          leafletMapRef.current = null;
        }
      };
    }, [initialCenter, initialZoom]);

    // Set up canvas sizing
    useEffect(() => {
      const handleResize = () => {
        if (canvasRef.current && mapRef.current) {
          const canvas = canvasRef.current;
          const container = mapRef.current;

          // Adjust canvas size to map container
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;

          // Redraw content after resize
          if (
            historyIndex >= 0 &&
            history.length > 0 &&
            history[historyIndex]
          ) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              try {
                ctx.putImageData(history[historyIndex], 0, 0);
              } catch (error) {
                console.error("Failed to redraw after resize:", error);
              }
            }
          }
        }
      };

      handleResize();
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }, [history, historyIndex]);

    // Canvas drawing handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (drawingTool === "text") {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setTextPosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
        return;
      }

      if (drawingTool === "shape" && drawingShape) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          setShapeStart({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
          });
        }
        setIsDrawing(true);
        return;
      }

      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setLastPos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const currentPos = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      if (drawingTool === "shape" && shapeStart) {
        // 図形描画のプレビュー
        // 前回の描画をクリア（履歴から最新の状態を再描画）
        if (historyIndex >= 0 && history[historyIndex]) {
          ctx.putImageData(history[historyIndex], 0, 0);
        } else {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.beginPath();

        switch (drawingShape) {
          case "circle":
            const radius = Math.sqrt(
              Math.pow(currentPos.x - shapeStart.x, 2) + 
              Math.pow(currentPos.y - shapeStart.y, 2)
            );
            ctx.arc(shapeStart.x, shapeStart.y, radius, 0, Math.PI * 2);
            break;
          case "rectangle":
            ctx.rect(
              shapeStart.x,
              shapeStart.y,
              currentPos.x - shapeStart.x,
              currentPos.y - shapeStart.y
            );
            break;
          case "triangle":
            ctx.moveTo(shapeStart.x, shapeStart.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            ctx.lineTo(shapeStart.x - (currentPos.x - shapeStart.x), currentPos.y);
            ctx.closePath();
            break;
          case "arrow":
            // 矢印の本体を描画
            ctx.moveTo(shapeStart.x, shapeStart.y);
            ctx.lineTo(currentPos.x, currentPos.y);
            
            // 矢印の先端を計算
            const angle = Math.atan2(currentPos.y - shapeStart.y, currentPos.x - shapeStart.x);
            const headLength = 15; // 矢印の先端の長さ
            
            ctx.lineTo(
              currentPos.x - headLength * Math.cos(angle - Math.PI / 6),
              currentPos.y - headLength * Math.sin(angle - Math.PI / 6)
            );
            ctx.moveTo(currentPos.x, currentPos.y);
            ctx.lineTo(
              currentPos.x - headLength * Math.cos(angle + Math.PI / 6),
              currentPos.y - headLength * Math.sin(angle + Math.PI / 6)
            );
            break;
        }

        ctx.stroke();
        return;
      }

      if (drawingTool === "pen" && lastPos) {
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
        setLastPos(currentPos);
      } else if (drawingTool === "eraser" && lastPos) {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = penSize * 2;
        ctx.beginPath();
        ctx.moveTo(lastPos.x, lastPos.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
        ctx.globalCompositeOperation = "source-over";
        setLastPos(currentPos);
      }
    };

    const endDrawing = () => {
      if (isDrawing && canvasRef.current) {
        setIsDrawing(false);

        // 図形描画の確定
        if (drawingTool === "shape" && shapeStart) {
          setShapeStart(null);
        }

        // 現在の状態を履歴に保存
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          try {
            const imageData = ctx.getImageData(
              0,
              0,
              canvasRef.current.width,
              canvasRef.current.height
            );

            // やり直し履歴を削除
            const newHistory = history.slice(0, historyIndex + 1);
            newHistory.push(imageData);

            setHistory(newHistory);
            setHistoryIndex(newHistory.length - 1);
          } catch (error) {
            console.error("描画状態の保存に失敗しました:", error);
          }
        }
      }
    };

    const addText = () => {
      if (!textPosition || !textInput || !canvasRef.current) return;

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      ctx.font = `${penSize * 5}px sans-serif`;
      ctx.fillStyle = penColor;
      ctx.fillText(textInput, textPosition.x, textPosition.y);

      // Save current state to history
      try {
        const imageData = ctx.getImageData(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );

        // Remove any redo history
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(imageData);

        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
      } catch (error) {
        console.error("Failed to save text state:", error);
      }

      // Reset text input
      setTextInput("");
      setTextPosition(null);
    };

    const undoDrawing = () => {
      if (historyIndex > 0 && canvasRef.current) {
        const newIndex = historyIndex - 1;
        const ctx = canvasRef.current.getContext("2d");

        if (ctx && history[newIndex]) {
          try {
            ctx.putImageData(history[newIndex], 0, 0);
            setHistoryIndex(newIndex);
          } catch (error) {
            console.error("Failed to undo:", error);
          }
        }
      }
    };

    const redoDrawing = () => {
      if (historyIndex < history.length - 1 && canvasRef.current) {
        const newIndex = historyIndex + 1;
        const ctx = canvasRef.current.getContext("2d");

        if (ctx && history[newIndex]) {
          try {
            ctx.putImageData(history[newIndex], 0, 0);
            setHistoryIndex(newIndex);
          } catch (error) {
            console.error("Failed to redo:", error);
          }
        }
      }
    };

    const clearCanvas = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }

        // Reset history
        setHistory([]);
        setHistoryIndex(-1);
      }
    };

    const [isSaving, setIsSaving] = useState(false);

    const saveImage = async () => {
      if (!canvasRef.current || !mapRef.current) {
        toast({
          title: "エラー",
          description: "キャンバスまたは地図が読み込まれていません",
          variant: "destructive",
        });
        return;
      }

      try {
        setIsSaving(true);

        // 地図を画像として取得
        const mapContainer = document.getElementById("map-container");
        if (!mapContainer) {
          throw new Error("地図コンテナが見つかりません");
        }

        // html2canvasを使用して地図を画像として取得
        const mapCanvas = await html2canvas(mapContainer, {
          useCORS: true,
          allowTaint: true,
          logging: false,
        });

        // 新しいキャンバスを作成して地図と描画内容を合成
        const combinedCanvas = document.createElement("canvas");
        combinedCanvas.width = canvasRef.current.width;
        combinedCanvas.height = canvasRef.current.height;
        const ctx = combinedCanvas.getContext("2d");
        
        if (!ctx) {
          throw new Error("キャンバスコンテキストの取得に失敗しました");
        }

        // 地図を描画
        ctx.drawImage(mapCanvas, 0, 0, combinedCanvas.width, combinedCanvas.height);
        
        // 描画内容を上に重ねる
        const drawingCtx = canvasRef.current.getContext("2d");
        if (drawingCtx) {
          const drawingData = drawingCtx.getImageData(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          ctx.putImageData(drawingData, 0, 0);
        }

        // 画像をダウンロード
        const dataUrl = combinedCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `regional-memory-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.png`;
        link.href = dataUrl;
        link.click();

        toast({
          title: "保存完了",
          description: "地図と描画内容が保存されました",
        });
      } catch (error) {
        console.error("画像の保存に失敗しました:", error);
        toast({
          title: "保存エラー",
          description: `画像の保存に失敗しました: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    const shareImage = async () => {
      if (canvasRef.current) {
        try {
          const dataUrl = canvasRef.current.toDataURL("image/png");
          const blob = await (await fetch(dataUrl)).blob();

          if (navigator.share && typeof navigator.share === "function") {
            try {
              await navigator.share({
                title: `${city}の土地勘マップ`,
                files: [
                  new File([blob], `${city}-map.png`, { type: "image/png" }),
                ],
              } as ShareData);

              toast({
                title: "共有しました",
                description: "マップ画像が正常に共有されました。",
              });
            } catch (shareError) {
              console.error("Share failed:", shareError);
              // Fallback if sharing fails
              downloadImage(blob);
            }
          } else {
            // Fallback for browsers without Web Share API
            downloadImage(blob);
          }
        } catch (error) {
          console.error("Failed to prepare image for sharing:", error);
          toast({
            title: "エラー",
            description: "マップの共有中にエラーが発生しました。",
            variant: "destructive",
          });
        }
      }
    };

    // Helper function for downloading
    const downloadImage = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${city}-map.png`;
      link.click();

      toast({
        title: "ダウンロードしました",
        description:
          "共有機能がサポートされていないため、画像をダウンロードしました。",
      });

      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    return (
      <div
        className={cn("relative w-full h-full overflow-hidden", className)}
        ref={ref}
        {...props}
      >
        <div id="map-container" ref={mapRef} className="w-full h-full z-1" />

        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full z-10 pointer-events-auto"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
        />

        {textPosition && (
          <div
            className="absolute z-20 p-2 bg-white border rounded-md shadow-md"
            style={{
              top: textPosition.y + 10,
              left: textPosition.x,
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="テキストを入力"
              className="p-1 border rounded mr-2"
              autoFocus
            />
            <Button size="sm" onClick={addText}>
              追加
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={() => setTextPosition(null)}
            >
              キャンセル
            </Button>
          </div>
        )}

        <div className="absolute top-4 left-4 z-20 p-3 bg-white rounded-lg shadow-md">
          <div className="mb-2 space-x-1">
            <Button
              size="sm"
              variant={drawingTool === "pen" ? "default" : "outline"}
              onClick={() => setDrawingTool("pen")}
            >
              ペン
            </Button>
            <Button
              size="sm"
              variant={drawingTool === "text" ? "default" : "outline"}
              onClick={() => setDrawingTool("text")}
            >
              テキスト
            </Button>
            <Button
              size="sm"
              variant={drawingTool === "eraser" ? "default" : "outline"}
              onClick={() => setDrawingTool("eraser")}
            >
              消しゴム
            </Button>
            <Button
              size="sm"
              variant={drawingTool === "shape" ? "default" : "outline"}
              onClick={() => setDrawingTool("shape")}
            >
              図形
            </Button>
          </div>

          {drawingTool === "shape" && (
            <div className="flex items-center space-x-2 mt-2">
              <Button
                size="sm"
                variant={drawingShape === "circle" ? "default" : "outline"}
                onClick={() => setDrawingShape("circle")}
              >
                ⭕
              </Button>
              <Button
                size="sm"
                variant={drawingShape === "rectangle" ? "default" : "outline"}
                onClick={() => setDrawingShape("rectangle")}
              >
                🔲
              </Button>
              <Button
                size="sm"
                variant={drawingShape === "triangle" ? "default" : "outline"}
                onClick={() => setDrawingShape("triangle")}
              >
                🔺
              </Button>
              <Button
                size="sm"
                variant={drawingShape === "arrow" ? "default" : "outline"}
                onClick={() => setDrawingShape("arrow")}
              >
                ➡️
              </Button>
            </div>
          )}

          {drawingTool !== "eraser" && (
            <div className="mb-2">
              <label className="block text-sm">色:</label>
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className="w-full h-8"
              />
            </div>
          )}

          <div className="mb-2">
            <label className="block text-sm">サイズ: {penSize}</label>
            <input
              type="range"
              min="1"
              max="20"
              value={penSize}
              onChange={(e) => setPenSize(parseInt(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex items-center space-x-2 mb-2">
            <Button
              size="sm"
              variant="outline"
              onClick={undoDrawing}
              disabled={historyIndex < 0}
            >
              ↩️ 元に戻す
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={redoDrawing}
              disabled={historyIndex >= history.length - 1}
            >
              ↪️ やり直す
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearCanvas}
            >
              🗑️ クリア
            </Button>
            <Button
              size="sm"
              variant="default"
              onClick={saveImage}
              disabled={isSaving}
            >
              {isSaving ? "保存中..." : "💾 保存"}
            </Button>
            <Button size="sm" variant="outline" onClick={shareImage}>
              共有
            </Button>
          </div>
        </div>
      </div>
    );
  }
);

MapClient.displayName = "MapClient";

export { MapClient };
