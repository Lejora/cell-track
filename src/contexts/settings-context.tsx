"use client";

import { SelectUserSettings } from "@/db/schema";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface SettingsContextType {
    settings: SelectUserSettings | null;
    isLoading: boolean;
    error: string | null;
    updateSettings: (settings: Partial<SelectUserSettings>) => Promise<void>;
    refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const [settings, setSettings] = useState<SelectUserSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const response = await fetch("/api/settings");
            if (response.ok) {
                const data = await response.json();
                setSettings(data);
            } else {
                // Use default settings if fetch fails
                setError(`Failed to fetch settings: ${response.status}`);
                setSettings({
                    id: 0,
                    userId: "",
                    defaultMapLat: 36.108905769550155,
                    defaultMapLng: 140.0997873925421,
                    defaultZoomLevel: 15,
                    showAccuracyCircles: true,
                    circleColor: "#fa6e6e",
                    circleOpacity: 0.05,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
            }
        } catch (error) {
            console.error("Failed to fetch settings:", error);
            setError(error instanceof Error ? error.message : "Unknown error occurred");
            // Use default settings on error
            setSettings({
                id: 0,
                userId: "",
                defaultMapLat: 36.108905769550155,
                defaultMapLng: 140.0997873925421,
                defaultZoomLevel: 15,
                showAccuracyCircles: true,
                circleColor: "#fa6e6e",
                circleOpacity: 0.05,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<SelectUserSettings>) => {
        try {
            const response = await fetch("/api/settings", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(newSettings),
            });

            if (response.ok) {
                const data = await response.json();
                setSettings(data.settings);
            } else {
                throw new Error("Failed to update settings");
            }
        } catch (error) {
            console.error("Failed to update settings:", error);
            throw error;
        }
    };

    const refreshSettings = async () => {
        await fetchSettings();
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                isLoading,
                error,
                updateSettings,
                refreshSettings,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}