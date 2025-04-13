"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import "leaflet/dist/leaflet.css";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";
import {
  Move,
  Undo,
  Redo,
  Save,
  Share,
  Download,
  Pen,
  Eraser,
  Type,
  Shapes,
  Circle,
  Square,
  Triangle,
  ArrowUp,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Trash2
} from "lucide-react";
import { GeoSearchControl, OpenStreetMapProvider } from "leaflet-geosearch";
import "leaflet-geosearch/dist/geosearch.css";
import * as L from 'leaflet';

// Define a proper interface for the Leaflet Map
interface LeafletMapInterface {
  setView: (center: [number, number], zoom: number) => any;
  remove: () => void;
  addLayer: (layer: any) => any;
  addControl: (control: any) => any;
  removeControl: (control: any) => any;
  on: (event: string, handler: Function) => any;
  off: (event: string, handler: Function) => any;
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
    // 描画ツールに'map'を追加し、初期値を'map'に設定
    const [drawingTool, setDrawingTool] = useState<
      "pen" | "text" | "eraser" | "shape" | "map"
    >(
      "map" // デフォルトで地図操作モードに設定
    );
    const [penColor, setPenColor] = useState("#000000");
    const [penSize, setPenSize] = useState(5);
    const [textSize, setTextSize] = useState(16); // テキストサイズの状態を追加
    const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(
      null
    );
    const [textInput, setTextInput] = useState("");
    const [textPosition, setTextPosition] = useState<{
      x: number;
      y: number;
    } | null>(null);

    // Drawing history for undo/redo
    const [history, setHistory] = useState<ImageData[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    // レイヤー管理用の状態
    const [layers, setLayers] = useState<any[]>([]);

    // ツールバーの開閉状態 (デフォルトは開いている状態)
    const [isToolbarOpen, setIsToolbarOpen] = useState(true);

    // ズームレベルを記憶する状態変数
    const [currentZoom, setCurrentZoom] = useState(initialZoom);
    const [zoomScale, setZoomScale] = useState(1);

    // Shape drawing state
    const [drawingShape, setDrawingShape] = useState<
      "circle" | "rectangle" | "triangle" | "arrow" | null
    >(null);
    const [shapeStart, setShapeStart] = useState<{
      x: number;
      y: number;
    } | null>(null);

    // Helper function to add layer and update history
    const addLayerAndUpdateHistory = (layer: any) => {
      const map = leafletMapRef.current;
      if (!map) return;
      map.addLayer(layer);
      const currentLayers = [...layers, layer];
      setLayers(currentLayers);
      // [将来のために] setHistory([...history, currentLayers]);
    };

    // Initialize map
    useEffect(() => {
      // We need to import Leaflet dynamically because it depends on the window object
      const initializeMap = async () => {
        try {
          if (mapRef.current && !leafletMapRef.current) {
            console.log("Initializing map...", initialCenter, initialZoom);
            // Import dynamically to avoid SSR issues
            const L = await import("leaflet");

            // マップオプションを設定
            const mapOptions = {
              zoomControl: false, // ズームコントロールは後で明示的に追加
              scrollWheelZoom: true, // ホイールズームを有効化
              doubleClickZoom: true, // ダブルクリックズームを有効化
              dragging: true, // ドラッグによる移動を有効化
              zoomSnap: 0.5, // ズームレベルの単位を小さくして滑らかな拡大縮小を実現
              zoomDelta: 0.5, // ズームボタンを押したときの変化量
            };

            // 地図を作成し、初期位置を設定
            const map = L.map(mapRef.current, mapOptions).setView(
              initialCenter,
              initialZoom
            );

            // タイルレイヤーを追加
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
              attribution:
                '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              maxZoom: 19,
              minZoom: 1,
            }).addTo(map);

            // ズームコントロールを追加 (右下に表示)
            L.control
              .zoom({
                position: "bottomright",
                zoomInText: "+",
                zoomOutText: "-",
                zoomInTitle: "ズームイン",
                zoomOutTitle: "ズームアウト",
              })
              .addTo(map);

            // ホイールズームを有効化
            map.scrollWheelZoom.enable();

            // 地図のズームイベントを監視
            map.on("zoom", () => {
              const newZoom = map.getZoom();
              console.log("マップズーム: " + newZoom);

              // 前回のズームレベルと現在のズームレベルの差を利用してスケールを計算
              const scale = Math.pow(2, initialZoom - newZoom);
              setZoomScale(scale);
              setCurrentZoom(newZoom);

              // キャンバス要素のスケールを調整
              if (canvasRef.current) {
                const canvas = canvasRef.current;
                const container = canvas.parentElement;
                if (container) {
                  // キャンバスの変換を設定
                  canvas.style.transform = `scale(${scale})`;
                  canvas.style.transformOrigin = "top left";
                }
              }

              // テキスト要素のスケール調整
              const textElements = document.querySelectorAll(".map-text");
              textElements.forEach((textEl) => {
                const el = textEl as HTMLElement;
                el.style.transform = `scale(${scale})`;
                el.style.transformOrigin = "top left";
              });
            });

            // 地図の移動イベントを監視
            map.on("move", () => {
              console.log("マップ移動: " + map.getCenter());
            });

            console.log("Map initialized successfully");
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
        } catch (error) {
          console.error("Failed to initialize map:", error);
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
      // 地図操作モードの場合は何もしない
      if (drawingTool === "map") {
        return;
      }

      if (drawingTool === "text") {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          // ズームレベルを考慮した座標計算
          setTextPosition({
            x: (e.clientX - rect.left) / zoomScale,
            y: (e.clientY - rect.top) / zoomScale,
          });
        }
        return;
      }

      if (drawingTool === "shape" && drawingShape) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
          // ズームレベルを考慮した座標計算
          setShapeStart({
            x: (e.clientX - rect.left) / zoomScale,
            y: (e.clientY - rect.top) / zoomScale,
          });
        }
        setIsDrawing(true);
        return;
      }

      setIsDrawing(true);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        // ズームレベルを考慮した座標計算
        setLastPos({
          x: (e.clientX - rect.left) / zoomScale,
          y: (e.clientY - rect.top) / zoomScale,
        });
      }
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDrawing || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      // ズームレベルを考慮した座標計算
      const currentPos = {
        x: (e.clientX - rect.left) / zoomScale,
        y: (e.clientY - rect.top) / zoomScale,
      };

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      if (drawingTool === "shape" && shapeStart) {
        // 図形描画のプレビュー
        // 前回の描画をクリア（履歴から最新の状態を再描画）
        if (historyIndex >= 0 && history[historyIndex]) {
          ctx.putImageData(history[historyIndex], 0, 0);
        } else {
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
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
            ctx.lineTo(
              shapeStart.x - (currentPos.x - shapeStart.x),
              currentPos.y
            );
            ctx.closePath();
            break;
          case "arrow":
            // 矢印の本体を描画
            ctx.moveTo(shapeStart.x, shapeStart.y);
            ctx.lineTo(currentPos.x, currentPos.y);

            // 矢印の先端を計算
            const angle = Math.atan2(
              currentPos.y - shapeStart.y,
              currentPos.x - shapeStart.x
            );
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

      // ズームスケールを考慮したフォントサイズと位置の調整
      ctx.font = `${textSize}px sans-serif`;
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
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
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

        // mapRef.current を含むマップコンテナの親要素（ルートコンテナ）を取得
        // コンポーネント自体の親要素を取得
        const rootContainer = mapRef.current.closest(".relative");
        if (!rootContainer) {
          throw new Error("マップコンテナの親要素が見つかりません");
        }

        // 一時的にSaving表示を設定（ユーザーに保存中であることを示す）
        const savingIndicator = document.createElement("div");
        savingIndicator.className =
          "absolute top-0 right-0 left-0 z-50 p-2 text-center text-white bg-black bg-opacity-50";
        savingIndicator.innerText = "画像を保存中...";
        rootContainer.appendChild(savingIndicator);

        // 短い遅延を入れて、UIの表示を確実にする
        await new Promise((resolve) => setTimeout(resolve, 100));

        // html2canvasを使用して地図全体（UIを含む）を画像として取得
        const mapCanvas = await html2canvas(rootContainer as HTMLElement, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 2, // 高品質な画像のために解像度を上げる
          backgroundColor: null, // 透過背景を許可
          ignoreElements: (element: Element) => {
            // 保存インジケーターを除外する
            if (element === savingIndicator) return true;

            // ツールバー・UIコントロールを除外する（地図と描画内容は維持）
            // トップバーのツールパネルを検出して除外
            if (
              element.classList &&
              element.classList.contains("rounded-lg") &&
              element.classList.contains("shadow-md") &&
              element.classList.contains("bg-white") &&
              element.classList.contains("z-20")
            ) {
              return true;
            }

            // テキスト入力用のポップアップがある場合は除外
            if (
              element.classList &&
              element.classList.contains("z-20") &&
              element.querySelector("input")
            ) {
              return true;
            }

            // Leafletのズームコントロール（右下の＋－ボタン）を除外
            if (
              element.classList &&
              (element.classList.contains("leaflet-control-zoom") ||
                element.classList.contains("leaflet-control-container") ||
                element.closest(".leaflet-control-zoom"))
            ) {
              return true;
            }

            return false;
          },
        });

        // 保存インジケーターを削除
        if (savingIndicator.parentNode) {
          savingIndicator.parentNode.removeChild(savingIndicator);
        }

        // html2canvasの結果をそのまま使用
        const combinedCanvas = mapCanvas;

        // 画像をダウンロード
        const dataUrl = combinedCanvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.download = `${city}-map.png`;
        link.href = dataUrl;
        link.click();

        toast({
          title: "保存完了",
          description: "",
        });
      } catch (error) {
        console.error("画像の保存に失敗しました:", error);
        toast({
          title: "保存エラー",
          description: `画像の保存に失敗しました: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    const shareImage = async () => {
      if (!canvasRef.current || !mapRef.current) {
        toast({
          title: "エラー",
          description: "キャンバスまたは地図が読み込まれていません",
          variant: "destructive",
        });
        return;
      }

      try {
        // UIを含む地図全体を取得するための処理
        const rootContainer = mapRef.current.closest(
          ".relative"
        ) as HTMLElement;
        if (!rootContainer) {
          throw new Error("マップコンテナの親要素が見つかりません");
        }

        // 一時的に処理中表示を設定
        const processingIndicator = document.createElement("div");
        processingIndicator.className =
          "absolute top-0 right-0 left-0 z-50 p-2 text-center text-white bg-black bg-opacity-50";
        processingIndicator.innerText = "画像を処理中...";
        rootContainer.appendChild(processingIndicator);

        // 短い遅延を入れて、UIの表示を確実にする
        await new Promise((resolve) => setTimeout(resolve, 100));

        // html2canvasを使用して地図全体（UIを含む）を画像として取得
        const mapCanvas = await html2canvas(rootContainer as HTMLElement, {
          useCORS: true,
          allowTaint: true,
          logging: false,
          scale: 2,
          backgroundColor: null,
          ignoreElements: (element: Element) => {
            // 処理中インジケーターを除外する
            if (element === processingIndicator) return true;

            // ツールバー・UIコントロールを除外する（地図と描画内容は維持）
            // トップバーのツールパネルを検出して除外
            if (
              element.classList &&
              element.classList.contains("rounded-lg") &&
              element.classList.contains("shadow-md") &&
              element.classList.contains("bg-white") &&
              element.classList.contains("z-20")
            ) {
              return true;
            }

            // テキスト入力用のポップアップがある場合は除外
            if (
              element.classList &&
              element.classList.contains("z-20") &&
              element.querySelector("input")
            ) {
              return true;
            }

            // Leafletのズームコントロール（右下の＋－ボタン）を除外
            if (
              element.classList &&
              (element.classList.contains("leaflet-control-zoom") ||
                element.classList.contains("leaflet-control-container") ||
                element.closest(".leaflet-control-zoom"))
            ) {
              return true;
            }

            return false;
          },
        });

        // インジケーターを削除
        if (processingIndicator.parentNode) {
          processingIndicator.parentNode.removeChild(processingIndicator);
        }

        // 画像をBlobに変換
        const dataUrl = mapCanvas.toDataURL("image/png");
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
              description:
                "マップ画像が正常に共有されました（ツールバーとズームボタンは除外）",
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
    };

    // Helper function for downloading - city変数とtoast関数を参照できるように同じスコープ内に定義
    const downloadImage = (blob: Blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // city変数を適切に参照できるようにする
      link.download = `${city}-map.png`;
      link.click();

      // toast関数を適切に参照できるようにする
      toast({
        title: "ダウンロードしました",
        description:
          "共有機能がサポートされていないため、画像をダウンロードしました（ツールバーとズームボタンは除外）",
      });

      // Clean up the URL
      setTimeout(() => URL.revokeObjectURL(url), 100);
    };

    const SearchControl = ({ map }: { map: LeafletMapInterface }) => {
      useEffect(() => {
        // 型アサーションを使用して型エラーを解消
        const provider = new (OpenStreetMapProvider as any)();
        const searchControl = new (GeoSearchControl as any)({
          provider,
          style: "bar",
          showMarker: true,
          autoClose: true,
          retainZoomLevel: false,
          animateZoom: true,
        });

        map.addControl(searchControl);
        return () => map.removeControl(searchControl);
      }, [map]);

      return null;
    };

    // テキストツール用のMapイベント追加
    useEffect(() => {
      if (!leafletMapRef.current) return;
      const map = leafletMapRef.current;

      // クリックイベントハンドラー
      const handleMapClick = (e: any) => {
        if (drawingTool === 'text') {
          const text = prompt("テキストを入力してください:");
          if (text && text.trim() !== "") {
            // divIconを作成してテキストを表示
            const textIcon = L.divIcon({
              className: 'custom-text-icon',
              html: `<div style="font-size: ${textSize || penSize}px; color: ${penColor}; white-space: nowrap;">${text}</div>`,
              iconSize: undefined,
              iconAnchor: [0, (textSize || penSize) / 2]
            });

            const marker = L.marker(e.latlng, { icon: textIcon });
            addLayerAndUpdateHistory(marker);
          }
        }
      };

      // イベントリスナーを追加
      map.on('click', handleMapClick);

      // クリーンアップ
      return () => {
        map.off('click', handleMapClick);
      };
    }, [drawingTool, penColor, penSize, textSize, layers]);

    return (
      <div
        className={cn("overflow-hidden relative w-full h-full", className)}
        ref={ref}
        {...props}
      >
        <div id="map-container" ref={mapRef} className="w-full h-full z-1" />
        {leafletMapRef.current && <SearchControl map={leafletMapRef.current} />}

        <div
          className="absolute top-0 left-0 z-10 w-full h-full"
          style={{
            pointerEvents: drawingTool === "map" ? "none" : "auto",
          }}
        >
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
            style={{
              cursor: drawingTool === "map" ? "default" : "crosshair",
              transformOrigin: "top left",
              transform: `scale(${zoomScale})`,
            }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={endDrawing}
            onMouseLeave={endDrawing}
          />
        </div>

        {textPosition && (
          <div
            className="absolute z-20 p-2 bg-white rounded-md border shadow-md"
            style={{
              top: (textPosition?.y || 0) + 10,
              left: textPosition?.x || 0,
            }}
          >
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="テキストを入力"
              className="p-1 mr-2 rounded border"
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
          {/* ツールバーヘッダー */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">ツールバー</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsToolbarOpen(!isToolbarOpen)}
              className="p-1 h-6"
              title={isToolbarOpen ? "ツールバーを閉じる" : "ツールバーを開く"}
            >
              {isToolbarOpen ? (
                <ChevronLeft className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* ツールバーの内容 - 開閉状態によって表示/非表示を切り替え */}
          {isToolbarOpen && (
            <>
              <div className="mt-4 mb-2 space-x-1">
                <Button
                  size="sm"
                  variant={drawingTool === "map" ? "default" : "outline"}
                  onClick={() => setDrawingTool("map")}
                  title="地図操作"
                >
                  <Move className="mr-1 w-4 h-4" /> 移動ツール
                </Button>
                <Button
                  size="sm"
                  variant={drawingTool === "pen" ? "default" : "outline"}
                  onClick={() => setDrawingTool("pen")}
                >
                  <Pen className="mr-1 w-4 h-4" /> ペン
                </Button>
                <Button
                  size="sm"
                  variant={drawingTool === "text" ? "default" : "outline"}
                  onClick={() => setDrawingTool("text")}
                >
                  <Type className="mr-1 w-4 h-4" /> テキスト
                </Button>
                <Button
                  size="sm"
                  variant={drawingTool === "eraser" ? "default" : "outline"}
                  onClick={() => setDrawingTool("eraser")}
                >
                  <Eraser className="mr-1 w-4 h-4" /> 消しゴム
                </Button>
                <Button
                  size="sm"
                  variant={drawingTool === "shape" ? "default" : "outline"}
                  onClick={() => setDrawingTool("shape")}
                >
                  <Shapes className="mr-1 w-4 h-4" /> 図形
                </Button>
              </div>

              {drawingTool === "shape" && (
                <div className="flex items-center mt-2 space-x-2">
                  <Button
                    size="sm"
                    variant={drawingShape === "circle" ? "default" : "outline"}
                    onClick={() => setDrawingShape("circle")}
                  >
                    <Circle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      drawingShape === "rectangle" ? "default" : "outline"
                    }
                    onClick={() => setDrawingShape("rectangle")}
                  >
                    <Square className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={
                      drawingShape === "triangle" ? "default" : "outline"
                    }
                    onClick={() => setDrawingShape("triangle")}
                  >
                    <Triangle className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant={drawingShape === "arrow" ? "default" : "outline"}
                    onClick={() => setDrawingShape("arrow")}
                  >
                    <ArrowUp className="w-4 h-4" />
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

              <div className="mb-2">
                <label className="block text-sm">テキストサイズ: {textSize}</label>
                <input
                  type="range"
                  min="8"
                  max="32"
                  value={textSize}
                  onChange={(e) => setTextSize(parseInt(e.target.value))}
                  className="w-full"
                />
              </div>

              <div className="flex items-center mb-2 space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={undoDrawing}
                  disabled={historyIndex < 0}
                >
                  <Undo className="mr-1 w-4 h-4" /> 元に戻す
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={redoDrawing}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo className="mr-1 w-4 h-4" /> やり直す
                </Button>
                <Button size="sm" variant="outline" onClick={clearCanvas}>
                  <Trash2 className="mr-1 w-4 h-4" /> クリア
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={saveImage}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    "保存中..."
                  ) : (
                    <>
                      <Save className="mr-1 w-4 h-4" /> 保存
                    </>
                  )}
                </Button>
                <Button size="sm" variant="outline" onClick={shareImage}>
                  <Share className="mr-1 w-4 h-4" /> 共有
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }
);

// コンポーネントの表示名を設定
MapClient.displayName = "MapClient";

// コンポーネントをエクスポート
export { MapClient };
