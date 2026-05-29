"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Palette } from "lucide-react";
import { z } from "zod";
import { useSettings } from "@/contexts/settings-context";

const mapSettingsSchema = z.object({
  defaultLat: z.number().min(-90, "緯度は-90から90の間で入力してください").max(90, "緯度は-90から90の間で入力してください"),
  defaultLng: z.number().min(-180, "経度は-180から180の間で入力してください").max(180, "経度は-180から180の間で入力してください"),
  zoomLevel: z.number().min(1, "ズームレベルは1から20の間で設定してください").max(20, "ズームレベルは1から20の間で設定してください"),
  showCircles: z.boolean(),
  circleColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "無効な色形式です"),
  circleOpacity: z.number().min(0, "透明度は0から1の間で設定してください").max(1, "透明度は0から1の間で設定してください"),
});

type MapSettings = z.infer<typeof mapSettingsSchema>;

export function MapSettingsTab() {
  const { toast } = useToast();
  const { settings: contextSettings, updateSettings } = useSettings();
  
  const [settings, setSettings] = useState<MapSettings>({
    defaultLat: 36.108905769550155,
    defaultLng: 140.0997873925421,
    zoomLevel: 15,
    showCircles: true,
    circleColor: "#fa6e6e",
    circleOpacity: 0.05,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof MapSettings, string>>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from context when available
  useEffect(() => {
    if (contextSettings) {
      setSettings({
        defaultLat: contextSettings.defaultMapLat ?? 36.108905769550155,
        defaultLng: contextSettings.defaultMapLng ?? 140.0997873925421,
        zoomLevel: contextSettings.defaultZoomLevel ?? 15,
        showCircles: contextSettings.showAccuracyCircles ?? true,
        circleColor: contextSettings.circleColor ?? "#fa6e6e",
        circleOpacity: contextSettings.circleOpacity ?? 0.05,
      });
    }
  }, [contextSettings]);

  const validateField = <K extends keyof MapSettings>(field: K, value: MapSettings[K]) => {
    try {
      const fieldSchema = mapSettingsSchema.shape[field];
      fieldSchema.parse(value);
      setErrors(prev => ({ ...prev, [field]: undefined }));
      return true;
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        setErrors(prev => ({ ...prev, [field]: zodError.errors[0]?.message }));
      }
      return false;
    }
  };

  const handleFieldChange = <K extends keyof MapSettings>(field: K, value: MapSettings[K]) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "位置情報がサポートされていません",
        description: "お使いのブラウザは位置情報をサポートしていません。",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        handleFieldChange("defaultLat", lat);
        handleFieldChange("defaultLng", lng);
        setIsLoading(false);
        toast({
          title: "位置情報を更新しました",
          description: "デフォルト位置を現在地に設定しました。",
        });
      },
      () => {
        setIsLoading(false);
        toast({
          title: "位置情報エラー",
          description: "現在地を取得できませんでした。",
          variant: "destructive",
        });
      }
    );
  };

  const handleSave = async () => {
    try {
      mapSettingsSchema.parse(settings);
      setIsSaving(true);

      // Update settings through the context
      await updateSettings({
        defaultMapLat: settings.defaultLat,
        defaultMapLng: settings.defaultLng,
        defaultZoomLevel: settings.zoomLevel,
        showAccuracyCircles: settings.showCircles,
        circleColor: settings.circleColor,
        circleOpacity: settings.circleOpacity,
      });

      toast({
        title: "設定を保存しました",
        description: "マップ設定が正常に更新されました。",
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        const zodError = error as z.ZodError;
        const fieldErrors: Partial<Record<keyof MapSettings, string>> = {};
        zodError.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as keyof MapSettings] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: "バリデーションエラー",
          description: "保存する前にエラーを修正してください。",
          variant: "destructive",
        });
      } else {
        console.error("Failed to save settings:", error);
        toast({
          title: "保存エラー",
          description: "設定の保存に失敗しました。もう一度お試しください。",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            デフォルト位置
          </CardTitle>
          <CardDescription>
            マップビューのデフォルトの中心点とズームレベルを設定します。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">緯度</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                value={settings.defaultLat}
                onChange={(e) => handleFieldChange("defaultLat", parseFloat(e.target.value) || 0)}
                className={errors.defaultLat ? "border-destructive" : ""}
                placeholder="緯度を入力 (-90 から 90)"
              />
              {errors.defaultLat && (
                <p className="text-sm text-destructive">{errors.defaultLat}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">経度</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                value={settings.defaultLng}
                onChange={(e) => handleFieldChange("defaultLng", parseFloat(e.target.value) || 0)}
                className={errors.defaultLng ? "border-destructive" : ""}
                placeholder="経度を入力 (-180 から 180)"
              />
              {errors.defaultLng && (
                <p className="text-sm text-destructive">{errors.defaultLng}</p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isLoading}
            className="w-full md:w-auto"
          >
            {isLoading ? "位置情報を取得中..." : "現在地を使用"}
          </Button>

          <div className="space-y-2">
            <Label htmlFor="zoom">デフォルトズームレベル: {settings.zoomLevel}</Label>
            <div className="px-2">
              <Slider
                value={settings.zoomLevel}
                onValueChange={(value) => handleFieldChange("zoomLevel", value)}
                min={1}
                max={20}
                step={1}
                className="w-full"
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1 (世界レベル)</span>
              <span>20 (建物レベル)</span>
            </div>
            {errors.zoomLevel && (
              <p className="text-sm text-destructive">{errors.zoomLevel}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            精度円
          </CardTitle>
          <CardDescription>
            基地局マーカー周辺の精度円の外観をカスタマイズします。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="show-circles">精度円を表示</Label>
              <p className="text-sm text-muted-foreground">
                基地局位置の精度範囲を示す円を表示します
              </p>
            </div>
            <Switch
              checked={settings.showCircles}
              onCheckedChange={(checked) => handleFieldChange("showCircles", checked)}
            />
          </div>

          {settings.showCircles && (
            <>
              <div className="space-y-2">
                <Label htmlFor="circle-color">円の色</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="circle-color"
                    type="color"
                    value={settings.circleColor}
                    onChange={(e) => handleFieldChange("circleColor", e.target.value)}
                    className="w-16 h-10 p-1 border rounded"
                  />
                  <Input
                    type="text"
                    value={settings.circleColor}
                    onChange={(e) => handleFieldChange("circleColor", e.target.value)}
                    className={`flex-1 ${errors.circleColor ? "border-destructive" : ""}`}
                    placeholder="#fa6e6e"
                  />
                </div>
                {errors.circleColor && (
                  <p className="text-sm text-destructive">{errors.circleColor}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="opacity">円の透明度: {Math.round(settings.circleOpacity * 100)}%</Label>
                <div className="px-2">
                  <Slider
                    value={settings.circleOpacity * 100}
                    onValueChange={(value) => handleFieldChange("circleOpacity", value / 100)}
                    min={0}
                    max={100}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>0% (透明)</span>
                  <span>100% (不透明)</span>
                </div>
                {errors.circleOpacity && (
                  <p className="text-sm text-destructive">{errors.circleOpacity}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  );
}