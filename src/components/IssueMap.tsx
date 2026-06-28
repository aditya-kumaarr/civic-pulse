"use client";

import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { useEffect } from "react";
import type { Issue } from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { colorToBg } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";

// Fix default icon path resolution in bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;

function makeIcon(emoji: string, color: string, status: string) {
  const dim = status === "resolved" ? "opacity:0.55;" : "";
  return L.divIcon({
    className: "",
    html: `<div class="civic-marker" style="background:${color};${dim}"><span>${emoji}</span></div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 36],
    popupAnchor: [0, -34],
  });
}

function youIcon() {
  return L.divIcon({
    className: "",
    html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 4px rgba(37,99,235,0.25),0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -12],
  });
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom ?? map.getZoom(), { duration: 0.8 });
  }, [center[0], center[1], map]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export function IssueMap({
  issues,
  center,
  zoom = 14,
  flyTo,
  userLoc,
  onSelectId,
}: {
  issues: Issue[];
  center: [number, number];
  zoom?: number;
  flyTo?: [number, number];
  userLoc?: { lat: number; lng: number } | null;
  onSelectId?: (id: string) => void;
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      scrollWheelZoom
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {flyTo && <FlyTo center={flyTo} />}
      {userLoc && (
        <Marker position={[userLoc.lat, userLoc.lng]} icon={youIcon()}>
          <Popup>You are here</Popup>
        </Marker>
      )}
      {issues.map((issue) => {
        const cat = getCategory(issue.category_id);
        return (
          <Marker
            key={issue.id}
            position={[issue.lat, issue.lng]}
            icon={makeIcon(cat.icon, colorToBg(cat.color), issue.status)}
            eventHandlers={{
              click: () => onSelectId?.(issue.id),
            }}
          >
            <Popup>
              <div className="w-52 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </div>
                <div className="font-semibold leading-snug" style={{ color: "var(--text)" }}>
                  {issue.title}
                </div>
                <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  {issue.location_name}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <StatusBadge status={issue.status} />
                  <Link
                    href={`/issues/${issue.id}`}
                    className="text-xs font-semibold hover:underline"
                    style={{ color: "var(--accent)" }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
