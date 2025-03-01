import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils/cn';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import html2canvas from 'html2canvas';

interface MapProps extends React.HTMLAttributes<HTMLDivElement> {
  initialCenter: [number, number];
  initialZoom: number;
  city: string;
}

// テキストオブジェクトのインターフェース
interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

const Map = React.forwardRef<HTMLDivElement, MapProps>(
  ({ className, initialCenter, initialZoom, city, ...props }, ref) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const leafletMapRef = useRef<any>(null);
    const { toast } = useToast();
    
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingTool, setDrawingTool] = useState<'pen' | 'text' | 'eraser' | 'select'>('pen');
    const [penColor, setPenColor] = useState('#000000');
    const [penSize, setPenSize] = useState(3);
    const [lastPos, setLastPos] = useState<{ x: number, y: number } | null>(null);
    const [textInput, setTextInput] = useState('');
    const [textPosition, setTextPosition] = useState<{ x: number, y: number } | null>(null);
    const [editingTextPosition, setEditingTextPosition] = useState<{ x: number, y: number } | null>(null);
    
    // テキストオブジェクトを管理する状態
    const [textObjects, setTextObjects] = useState<TextObject[]>([]);
    const [selectedObject, setSelectedObject] = useState<string | null>(null);
    const [editingText, setEditingText] = useState<string | null>(null);
    
    // Drawing history for undo/redo
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // Initialize map
    useEffect(() => {
      // We need to import Leaflet dynamically because it depends on the window object
      const initializeMap = async () => {
        if (mapRef.current && !leafletMapRef.current) {
          const L = (await import('leaflet')).default;
          
          const map = L.map(mapRef.current).setView(initialCenter, initialZoom);
          
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            maxZoom: 19,
          }).addTo(map);
          
          leafletMapRef.current = map;
          
          // Save initial state after map is loaded
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
              setHistory([imageData]);
              setHistoryIndex(0);
            }
          }
        }
      };
      
      initializeMap();
      
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
          if (historyIndex >= 0 && history[historyIndex]) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.putImageData(history[historyIndex], 0, 0);
            }
          }
        }
      };
      
      handleResize();
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }, [history, historyIndex]);
    
    // Canvas drawing handlers
    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 選択モードの場合は描画しない
      if (drawingTool === 'select' || drawingTool === 'text') return;
      
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setIsDrawing(true);
      setLastPos({ x, y });
    };
    
    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      // 選択モードの場合は描画しない
      if (drawingTool === 'select' || drawingTool === 'text') return;
      
      if (!isDrawing || !lastPos || !canvasRef.current) return;
      
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.lineWidth = penSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      if (drawingTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = penColor;
      }
      
      ctx.stroke();
      setLastPos({ x, y });
    };
    
    const endDrawing = () => {
      // 選択モードの場合は何もしない
      if (drawingTool === 'select' || drawingTool === 'text') return;
      
      if (isDrawing && canvasRef.current) {
        setIsDrawing(false);
        
        // Save current state to history
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // Remove any redo history
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(imageData);
          
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
        }
      }
    };
    
    const addText = () => {
      if (!textPosition || !textInput) return;
      
      // 新しいテキストオブジェクトを作成
      const newTextObject: TextObject = {
        id: `text-${Date.now()}`,
        text: textInput,
        x: textPosition.x,
        y: textPosition.y,
        color: penColor,
        size: penSize * 5
      };
      
      // テキストオブジェクトを状態に追加
      setTextObjects([...textObjects, newTextObject]);
      
      // キャンバスを再描画
      redrawCanvas();
      
      // テキスト入力をリセット
      setTextInput('');
      setTextPosition(null);
    };
    
    const redrawCanvas = () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          // 背景をクリア
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          
          // テキストオブジェクトを描画
          textObjects.forEach((textObject) => {
            ctx.font = `${textObject.size}px sans-serif`;
            ctx.fillStyle = textObject.color;
            ctx.fillText(textObject.text, textObject.x, textObject.y);
            
            // 選択されたオブジェクトをハイライト表示
            if (selectedObject === textObject.id) {
              const textWidth = textObject.text.length * (textObject.size / 2);
              ctx.strokeStyle = '#3b82f6'; // 青色のハイライト
              ctx.lineWidth = 2;
              ctx.strokeRect(
                textObject.x - 5,
                textObject.y - textObject.size,
                textWidth + 10,
                textObject.size + 10
              );
            }
          });
        }
      }
    };
    
    // テキストオブジェクトが変更されたときにキャンバスを再描画
    useEffect(() => {
      redrawCanvas();
    }, [textObjects, selectedObject]);
    
    const undo = () => {
      if (historyIndex > 0 && canvasRef.current) {
        const newIndex = historyIndex - 1;
        const ctx = canvasRef.current.getContext('2d');
        
        if (ctx && history[newIndex]) {
          ctx.putImageData(history[newIndex], 0, 0);
          setHistoryIndex(newIndex);
        }
      }
    };
    
    const redo = () => {
      if (historyIndex < history.length - 1 && canvasRef.current) {
        const newIndex = historyIndex + 1;
        const ctx = canvasRef.current.getContext('2d');
        
        if (ctx && history[newIndex]) {
          ctx.putImageData(history[newIndex], 0, 0);
          setHistoryIndex(newIndex);
        }
      }
    };
    
    const saveImage = () => {
      // マップ全体のコンテナ要素を参照
      const mapContainer = typeof ref === 'object' && ref !== null && 'current' in ref
        ? ref.current
        : document.querySelector('.relative.w-full.h-full.overflow-hidden');
      
      if (mapContainer) {
        try {
          toast({
            title: "処理中",
            description: "マップ画像を生成しています...",
          });
          
          // html2canvasを使用してマップ全体をキャプチャ
          html2canvas(mapContainer as HTMLElement, {
            useCORS: true, // クロスオリジン画像を許可
            allowTaint: true, // 外部コンテンツを許可
            logging: false, // デバッグログを無効化
            backgroundColor: null, // 透明な背景
          }).then(canvas => {
            // 画像をダウンロード
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `${city}-map.png`;
            link.click();
            
            toast({
              title: "保存しました",
              description: "マップ画像が正常にダウンロードされました。",
            });
          }).catch(error => {
            console.error('Map capture error:', error);
            toast({
              title: "エラー",
              description: "マップの保存中にエラーが発生しました。",
              variant: "destructive",
            });
          });
        } catch (error) {
          console.error('Map capture error:', error);
          toast({
            title: "エラー",
            description: "マップの保存中にエラーが発生しました。",
            variant: "destructive",
          });
        }
      }
    };
    
    const shareImage = async () => {
      if (canvasRef.current) {
        try {
          const dataUrl = canvasRef.current.toDataURL('image/png');
          const blob = await (await fetch(dataUrl)).blob();
          
          if (navigator.share) {
            await navigator.share({
              title: `${city}の土地勘マップ`,
              files: [new File([blob], `${city}-map.png`, { type: 'image/png' })],
            });
            
            toast({
              title: "共有しました",
              description: "マップ画像が正常に共有されました。",
            });
          } else {
            // Fallback for browsers without Web Share API
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${city}-map.png`;
            link.click();
            
            toast({
              title: "ダウンロードしました",
              description: "共有機能がサポートされていないため、画像をダウンロードしました。",
            });
          }
        } catch (error) {
          toast({
            title: "エラー",
            description: "マップの共有中にエラーが発生しました。",
            variant: "destructive",
          });
        }
      }
    };
    
    // テキストオブジェクトの選択
    const selectTextObject = (x: number, y: number) => {
      // クリック位置に最も近いテキストオブジェクトを探す
      const selected = textObjects.find(obj => {
        // 簡易的な当たり判定（より精密な判定が必要な場合は調整してください）
        const textWidth = obj.text.length * (obj.size / 2);
        return (
          x >= obj.x - 10 &&
          x <= obj.x + textWidth + 10 &&
          y >= obj.y - obj.size &&
          y <= obj.y + 10
        );
      });
      
      if (selected) {
        setSelectedObject(selected.id);
        return true;
      } else {
        setSelectedObject(null);
        return false;
      }
    };
    
    // 選択したテキストオブジェクトの削除
    const deleteSelectedObject = () => {
      if (selectedObject) {
        setTextObjects(textObjects.filter(obj => obj.id !== selectedObject));
        setSelectedObject(null);
        redrawCanvas();
      }
    };
    
    // 選択したテキストオブジェクトの編集開始
    const startEditingSelectedObject = () => {
      if (selectedObject) {
        const textObj = textObjects.find(obj => obj.id === selectedObject);
        if (textObj) {
          setEditingText(textObj.text);
          setEditingTextPosition({ x: textObj.x, y: textObj.y });
        }
      }
    };
    
    // 選択したテキストオブジェクトの更新
    const updateSelectedObject = () => {
      if (selectedObject && editingText !== null && editingTextPosition) {
        setTextObjects(textObjects.map(obj => 
          obj.id === selectedObject 
            ? { ...obj, text: editingText, x: editingTextPosition.x, y: editingTextPosition.y } 
            : obj
        ));
        setEditingText(null);
        setEditingTextPosition(null);
        redrawCanvas();
      }
    };
    
    // キャンバスのクリックイベントを処理
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      if (drawingTool === 'select') {
        // 選択モードの場合、テキストオブジェクトを選択
        selectTextObject(x, y);
      } else if (drawingTool === 'text') {
        // テキスト追加モードの場合、位置を設定
        setTextPosition({ x, y });
      }
    };
    
    return (
      <div
        className={cn("relative w-full h-full overflow-hidden", className)}
        ref={ref}
        {...props}
      >
        <div ref={mapRef} className="w-full h-full z-1" />
        
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full z-10 pointer-events-auto"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onClick={handleCanvasClick}
        />
        
        {textPosition && (
          <div className="absolute z-20 p-2 bg-white border rounded-md shadow-md" style={{ 
            top: textPosition.y + 10, 
            left: textPosition.x 
          }}>
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="テキストを入力"
              className="p-1 border rounded mr-2"
              autoFocus
            />
            <Button size="sm" onClick={addText}>追加</Button>
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
        
        {selectedObject && (
          <div className="absolute z-20 p-2 bg-white border rounded-md shadow-md" style={{ 
            top: 10, 
            left: 10 
          }}>
            <Button size="sm" onClick={startEditingSelectedObject}>編集</Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-2" 
              onClick={deleteSelectedObject}
            >
              削除
            </Button>
          </div>
        )}
        
        {editingText !== null && editingTextPosition && (
          <div className="absolute z-20 p-2 bg-white border rounded-md shadow-md" style={{ 
            top: editingTextPosition.y + 10, 
            left: editingTextPosition.x 
          }}>
            <input
              type="text"
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder="テキストを入力"
              className="p-1 border rounded mr-2"
              autoFocus
            />
            <Button size="sm" onClick={updateSelectedObject}>更新</Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="ml-2" 
              onClick={() => setEditingText(null)}
            >
              キャンセル
            </Button>
          </div>
        )}
        
        <div className="absolute top-4 left-4 z-20 p-3 bg-white rounded-lg shadow-md">
          <div className="mb-2 space-x-1">
            <Button 
              size="sm" 
              variant={drawingTool === 'pen' ? "default" : "outline"} 
              onClick={() => setDrawingTool('pen')}
            >
              ペン
            </Button>
            <Button 
              size="sm" 
              variant={drawingTool === 'text' ? "default" : "outline"} 
              onClick={() => setDrawingTool('text')}
            >
              テキスト
            </Button>
            <Button 
              size="sm" 
              variant={drawingTool === 'eraser' ? "default" : "outline"} 
              onClick={() => setDrawingTool('eraser')}
            >
              消しゴム
            </Button>
            <Button 
              size="sm" 
              variant={drawingTool === 'select' ? "default" : "outline"} 
              onClick={() => setDrawingTool('select')}
            >
              選択
            </Button>
          </div>
          
          {drawingTool !== 'eraser' && (
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
          
          <div className="flex space-x-1 mb-2">
            <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
              元に戻す
            </Button>
            <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
              やり直す
            </Button>
          </div>
          
          <div className="flex space-x-1">
            <Button size="sm" onClick={saveImage}>
              保存
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

Map.displayName = "Map";

export { Map };
