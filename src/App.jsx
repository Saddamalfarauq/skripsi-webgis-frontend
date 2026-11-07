import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  Download, 
  Droplets, 
  Eye, 
  FileText, 
  Globe, 
  Info, 
  Layers, 
  MapPin, 
  RotateCcw, 
  Search, 
  Share2,
  Server,
  Sliders,
  Check,
  ChevronDown,
  X,
  ExternalLink,
  Shield,
  Activity
} from 'lucide-react';

// Fix Leaflet default marker icons in React/Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Official 14 Districts in Kabupaten Maros
const KECAMATAN_LIST = [
  "Bantimurung", "Bontoa", "Camba", "Cenrana", "Lau", 
  "Mallawa", "Mandai", "Maros Baru", "Marusu", "Moncongloe", 
  "Simbang", "Tanralili", "Tompobulu", "Turikale"
];

// Map Scale Bar Control (Essential GIS Standard)
function MapScaleControl() {
  const map = useMap();
  useEffect(() => {
    const scale = L.control.scale({ metric: true, imperial: false, position: 'bottomleft' });
    scale.addTo(map);
    return () => {
      scale.remove();
    };
  }, [map]);
  return null;
}

// Map Auto-zoom Controller (Only triggers on explicit prediction/kecamatan change)
function MapBoundsController({ geojsonData, selectedKecamatan }) {
  const map = useMap();
  const lastTargetRef = useRef(null);

  useEffect(() => {
    if (!geojsonData || !geojsonData.features || geojsonData.features.length === 0) {
      return;
    }

    const currentKey = `${geojsonData.features.length}-${selectedKecamatan || 'all'}`;
    if (lastTargetRef.current === currentKey) {
      return;
    }
    lastTargetRef.current = currentKey;

    try {
      const filteredFeatures = selectedKecamatan
        ? geojsonData.features.filter(f => {
            const d = f.properties?.daerah || f.properties?.nm_kecamatan;
            return d && d.toLowerCase().replace(/\s+/g, '') === selectedKecamatan.toLowerCase().replace(/\s+/g, '');
          })
        : geojsonData.features;

      if (filteredFeatures.length === 0) return;

      const tempLayer = L.geoJSON({
        type: 'FeatureCollection',
        features: filteredFeatures
      });
      const bounds = tempLayer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: selectedKecamatan ? 13 : 11, duration: 0.8 });
      }
    } catch (err) {
      console.warn("MapBoundsController fitBounds warning:", err);
    }
  }, [geojsonData, selectedKecamatan, map]);

  return null;
}

// Bilingual Dictionary (Indonesian BNPB standard & English UN-SPIDER standard)
const I18N = {
  id: {
    agencyTag: "KABUPATEN MAROS • SULAWESI SELATAN",
    appTitle: "WebGIS Deteksi Potensi Banjir",
    appSubtitle: "Analisis Multi-Sensor Citra Satelit Sentinel-1 SAR & Sentinel-2 Berbasis Cascaded Deep Learning",
    statusReady: "Sistem Siap",
    statusProcessing: "Memproses Citra...",
    statusConnected: "Backend Aktif (Port 8000)",
    statusDisconnected: "Backend Siap (Klik Deteksi)",
    secSatellite: "1. Parameter & Deteksi Citra Satelit",
    labelDate: "Tanggal Akuisisi Citra",
    dateHint: "Pilih tanggal citra Sentinel-1/Sentinel-2",
    btnDetect: "Mulai Deteksi Satelit",
    btnDetecting: "Mengunduh GEE & Menjalankan AI...",
    sampleScenarios: "Skenario Uji Sampel Bencana:",
    scenario1: "Banjir Maros Jan 2023 (29 Zona)",
    scenario1Sub: "Januari 2023 • 13.280 Ha (Otsu & SAR)",
    scenario2: "Genangan Musim Hujan (30 Zona)",
    scenario2Sub: "Musim Hujan • 14.033 Ha (Otsu)",
    secAnalysis: "2. Hasil Analisis Spasial & Statistik",
    emptyAnalysisTitle: "Belum Ada Data Deteksi Aktif",
    emptyAnalysisDesc: "Pilih tanggal citra satelit dan klik 'Mulai Deteksi Satelit', atau pilih salah satu skenario sampel riwayat bencana di atas.",
    kpiTotalArea: "Total Luas Genangan",
    kpiPolygons: "Zona Poligon",
    kpiCriticalArea: "Kecamatan Terparah",
    kpiHazardLevel: "Tingkat Bahaya",
    filterDistrict: "Fokus & Filter Kecamatan:",
    allDistricts: "-- Tampilkan Semua Kecamatan (14) --",
    btnResetFilter: "Reset Filter",
    tableTitle: "Rekapitulasi Luas Terdampak per Kecamatan",
    colKecamatan: "Kecamatan",
    colArea: "Luas (Ha)",
    colRisk: "Klasifikasi Bahaya",
    tableHint: "Klik baris untuk memfokuskan peta",
    secLayers: "3. Manajemen Lapisan & Kartografi",
    basemapTitle: "Peta Dasar (Basemap):",
    basemapSat: "Esri Citra Satelit",
    basemapDark: "Carto Dark Canvas",
    basemapOsm: "OpenStreetMap",
    layerTogglesTitle: "Visibilitas Lapisan Spasial:",
    layerMarosBoundary: "Batas Administrasi Kabupaten Maros",
    layerKecamatanBoundary: "Batas 14 Kecamatan",
    layerFloodPolygons: "Poligon Genangan Potensi Banjir",
    labelOpacity: "Opasitas Poligon Banjir:",
    secLegend: "4. Legenda Klasifikasi Bahaya (BNPB)",
    legendVeryHigh: "Sangat Tinggi",
    legendHigh: "Tinggi",
    legendModerate: "Sedang",
    legendLow: "Rendah",
    legendVeryLow: "Sangat Rendah",
    secExport: "5. Ekspor & Integrasi GIS",
    btnDownloadGeoJSON: "Unduh GeoJSON (Layer GIS)",
    btnCopyBrief: "Salin Ringkasan Laporan",
    copied: "Tersalin ke Clipboard!",
    secXai: "6. Validasi Metodologi & Explainable AI",
    xaiTitle: "Arsitektur Cascaded Dual-Stage",
    xaiStage1: "Stage 1: CNN EfficientNet-B4 (Klasifikasi Risiko Makro)",
    xaiStage2: "Stage 2: Mask R-CNN ResNet-101 FPN (Segmentasi Mikro)",
    xaiTensor: "Input Tensor: Sentinel-1 SAR (VV/VH), Sentinel-2 MSI, NDVI, NDWI, DEM SRTM 30m",
    btnOpenXaiModal: "Lihat Panel Validasi Grad-CAM",
    xaiModalTitle: "Validasi Ilmiah & Explainable AI (Grad-CAM Heatmap)",
    xaiModalSubtitle: "Transparansi Model Deep Learning Menggunakan Fisika Radar SAR dan Geomorfologi",
    xaiPoint1Title: "Hamburan Balik Radar SAR Bebas Bias Awan",
    xaiPoint1Desc: "Atensi Grad-CAM fokus pada nilai koefisien hamburan balik radar Sentinel-1 < -14 dB (specular reflection pada permukaan air tenang), membuktikan model tidak terdistorsi tutupan awan.",
    xaiPoint2Title: "Validasi Elevasi Topografi (DEM SRTM 30m)",
    xaiPoint2Desc: "Poligon delineasi berkorelasi akurat dengan daerah cekungan dataran rendah barat Maros (< 10 mdpl), konsisten dengan dinamika hidrologi genangan air.",
    btnClose: "Tutup",
    btnResetDetection: "Reset Hasil Deteksi",
    footerThesis: "Skripsi Teknik Informatika Universitas Bosowa (2026) • Saddam Alfarauq",
    popupTitle: "Informasi Zona Genangan",
    popupDistrict: "Kecamatan",
    popupRisk: "Tingkat Bahaya",
    popupArea: "Estimasi Luas",
    popupSensor: "Sensor / Model",
    popupDate: "Tanggal Citra",
    errorBackend: "Gagal terhubung ke backend server (FastAPI/ngrok). Pastikan server backend lokal & ngrok berjalan, atau gunakan Skenario Uji Sampel di atas.",
    btnApiSettings: "Pengaturan Koneksi Backend",
    apiModalTitle: "Koneksi Backend Server (FastAPI / Ngrok)",
    apiModalSubtitle: "Konfigurasi URL Endpoint Server Inferensi AI untuk Localhost & Deployment Vercel",
    apiActiveLabel: "Endpoint Aktif Saat Ini:",
    apiPlaceholder: "https://...ngrok-free.dev/api/predict atau http://localhost:8000/api/predict",
    apiSave: "Simpan & Terapkan Endpoint",
    apiResetLocal: "Localhost (Port 8000)",
    apiResetNgrok: "Ngrok Tunnel (Saddam)",
    apiTestPing: "Uji Koneksi (Test Ping)",
    apiTestingPing: "Menghubungi server...",
    apiSavedAlert: "Endpoint API berhasil disimpan dan diterapkan!"
  },
  en: {
    agencyTag: "MAROS REGENCY • SOUTH SULAWESI, INDONESIA",
    appTitle: "Flood Risk Monitoring WebGIS",
    appSubtitle: "Multi-Sensor Satellite Analysis (Sentinel-1 SAR & Sentinel-2 MSI) via Cascaded Deep Learning",
    statusReady: "System Ready",
    statusProcessing: "Acquiring & Processing...",
    statusConnected: "Backend Connected (Port 8000)",
    statusDisconnected: "Backend Standby (Click Detect)",
    secSatellite: "1. Satellite Acquisition & Detection",
    labelDate: "Acquisition Target Date",
    dateHint: "Select date for Sentinel-1/Sentinel-2 pass",
    btnDetect: "Execute Satellite Detection",
    btnDetecting: "Retrieving GEE & Running AI...",
    sampleScenarios: "Benchmark Test Scenarios:",
    scenario1: "Maros Major Flood Jan 2023 (29 Zones)",
    scenario1Sub: "January 2023 • 13,280 Ha (Otsu & SAR)",
    scenario2: "Moderate Monsoon Inundation (30 Zones)",
    scenario2Sub: "Monsoon • 14,033 Ha (Otsu)",
    secAnalysis: "2. Spatial Analysis & Statistics",
    emptyAnalysisTitle: "No Active Detection Loaded",
    emptyAnalysisDesc: "Select an acquisition date and click 'Execute Satellite Detection', or choose a benchmark scenario above to inspect inundation extents.",
    kpiTotalArea: "Total Flooded Extent",
    kpiPolygons: "Delineated Zones",
    kpiCriticalArea: "Most Affected District",
    kpiHazardLevel: "Hazard Severity",
    filterDistrict: "District Focus & Filter:",
    allDistricts: "-- Show All 14 Districts --",
    btnResetFilter: "Reset Filter",
    tableTitle: "District Inundation Breakdown",
    colKecamatan: "District",
    colArea: "Area (Ha)",
    colRisk: "Hazard Level",
    tableHint: "Click row to focus map on district",
    secLayers: "3. Spatial Layers & Cartography",
    basemapTitle: "Base Cartography (Basemap):",
    basemapSat: "Esri Satellite Imagery",
    basemapDark: "Carto Dark Canvas",
    basemapOsm: "OpenStreetMap",
    layerTogglesTitle: "Layer Visibility Controls:",
    layerMarosBoundary: "Maros Regency Administrative Boundary",
    layerKecamatanBoundary: "District Administrative Boundaries (14)",
    layerFloodPolygons: "Flood Hazard Inundation Polygons",
    labelOpacity: "Flood Polygon Opacity:",
    secLegend: "4. Hazard Classification Legend (BNPB)",
    legendVeryHigh: "Very High",
    legendHigh: "High",
    legendModerate: "Moderate",
    legendLow: "Low",
    legendVeryLow: "Very Low",
    secExport: "5. GIS Export & Intelligence Brief",
    btnDownloadGeoJSON: "Download GeoJSON (GIS Layer)",
    btnCopyBrief: "Copy Intelligence Brief",
    copied: "Copied to Clipboard!",
    secXai: "6. Scientific Validation & Explainable AI",
    xaiTitle: "Cascaded Dual-Stage Architecture",
    xaiStage1: "Stage 1: CNN EfficientNet-B4 (Macro Risk Classification)",
    xaiStage2: "Stage 2: Mask R-CNN ResNet-101 FPN (Micro Delineation)",
    xaiTensor: "Input Tensor: Sentinel-1 SAR (VV/VH), Sentinel-2 MSI, NDVI, NDWI, SRTM DEM 30m",
    btnOpenXaiModal: "View Grad-CAM Validation Panel",
    xaiModalTitle: "Scientific Validation & Explainable AI (Grad-CAM Heatmap)",
    xaiModalSubtitle: "Model Interpretability Grounded in Radar Physics and Geomorphology",
    xaiPoint1Title: "SAR Radar Physics Without Optical Cloud Bias",
    xaiPoint1Desc: "Grad-CAM attention focuses on Sentinel-1 radar backscatter values < -14 dB (specular water reflection), mathematically proving independence from cloud cover artifacts.",
    xaiPoint2Title: "Topographic Elevation Validation (SRTM DEM 30m)",
    xaiPoint2Desc: "Predicted polygons align precisely with western Maros lowland depressions (< 10m MSL), adhering to physical gravity and hydrological drainage flow.",
    btnClose: "Close",
    btnResetDetection: "Reset Detection Data",
    footerThesis: "B.Sc. Thesis in Informatics, Bosowa University (2026) • Saddam Alfarauq",
    popupTitle: "Inundation Zone Profile",
    popupDistrict: "District",
    popupRisk: "Hazard Level",
    popupArea: "Estimated Extent",
    popupSensor: "Sensor / Model",
    popupDate: "Acquisition Date",
    errorBackend: "Could not reach backend server (FastAPI/ngrok). Ensure local backend & ngrok tunnel are running, or use the Benchmark Test Scenarios above.",
    btnApiSettings: "Backend Connection Settings",
    apiModalTitle: "Backend Server Connection (FastAPI / Ngrok)",
    apiModalSubtitle: "Configure AI Inference API Endpoint for Localhost & Vercel Deployment",
    apiActiveLabel: "Currently Active Endpoint:",
    apiPlaceholder: "https://...ngrok-free.dev/api/predict or http://localhost:8000/api/predict",
    apiSave: "Save & Apply Endpoint",
    apiResetLocal: "Localhost (Port 8000)",
    apiResetNgrok: "Ngrok Tunnel (Saddam)",
    apiTestPing: "Test Connection (Ping)",
    apiTestingPing: "Contacting server...",
    apiSavedAlert: "API endpoint successfully saved and applied!"
  }
};

export default function App() {
  const [lang, setLang] = useState('id'); // 'id' | 'en'
  const t = I18N[lang];

  // Dates: Default to 2023-01-15 (a known historical peak flood date in Maros for quick relevance) or today
  const [date, setDate] = useState('2023-01-15');
  const [loading, setLoading] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [error, setError] = useState(null);

  // Core Data States
  // NOTE: prediction starts as null as requested! Only loads upon explicit user action.
  const [prediction, setPrediction] = useState(null);
  const [marosBoundary, setMarosBoundary] = useState(null);
  const [kecamatanBoundary, setKecamatanBoundary] = useState(null);

  // Filters & Map Controls
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [showMaros, setShowMaros] = useState(true);
  const [showKecamatan, setShowKecamatan] = useState(true);
  const [showFlood, setShowFlood] = useState(true);
  const [floodOpacity, setFloodOpacity] = useState(0.65);
  const [basemap, setBasemap] = useState('satellite'); // 'satellite' | 'dark' | 'osm'

  // UI Modals & Notifications
  const [showXaiModal, setShowXaiModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [activeSourceLabel, setActiveSourceLabel] = useState('');

  // API Backend URL Management (Seamless Ngrok Tunnel on Vercel + Localhost)
  const DEFAULT_NGROK_API = "https://frenzy-provolone-duvet.ngrok-free.dev/api/predict";
  const DEFAULT_LOCAL_API = "http://localhost:8000/api/predict";

  const [apiUrl, setApiUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('webgis_custom_api');
      if (saved) return saved;

      const isRemote = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      const envUrl = import.meta.env.VITE_API_URL;

      if (isRemote) {
        if (envUrl && !envUrl.includes('localhost')) {
          return envUrl;
        }
        return DEFAULT_NGROK_API;
      }
      return envUrl || DEFAULT_LOCAL_API;
    }
    return import.meta.env.VITE_API_URL || DEFAULT_NGROK_API;
  });

  const [showApiModal, setShowApiModal] = useState(false);
  const [customApiInput, setCustomApiInput] = useState('');
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState(null);
  const [apiSaveAlert, setApiSaveAlert] = useState(false);

  const handleSaveApiUrl = (newUrl) => {
    const finalUrl = (newUrl || customApiInput).trim();
    if (!finalUrl) return;
    setApiUrl(finalUrl);
    if (typeof window !== 'undefined') {
      localStorage.setItem('webgis_custom_api', finalUrl);
    }
    setCustomApiInput(finalUrl);
    setApiSaveAlert(true);
    setTimeout(() => setApiSaveAlert(false), 3000);
  };

  const handleTestPing = async () => {
    setTestingPing(true);
    setPingResult(null);
    try {
      const target = (customApiInput || apiUrl).trim();
      const testUrl = target.includes('/api/predict') ? target.replace('/api/predict', '/docs') : target;
      await axios.get(testUrl, {
        headers: { "ngrok-skip-browser-warning": "69420" },
        timeout: 6000
      });
      setPingResult({ 
        success: true, 
        message: lang === 'id' ? "Server backend merespons aktif & terhubung!" : "Backend server responded active & connected!" 
      });
    } catch (e) {
      if (e.response) {
        setPingResult({ 
          success: true, 
          message: lang === 'id' ? `Server aktif (Status ${e.response.status}). Koneksi berhasil!` : `Server online (Status ${e.response.status}). Connected!` 
        });
      } else {
        setPingResult({ 
          success: false, 
          message: lang === 'id' ? "Tidak dapat menjangkau server. Pastikan FastAPI & ngrok aktif." : "Could not reach server. Verify FastAPI & ngrok are running." 
        });
      }
    } finally {
      setTestingPing(false);
    }
  };

  // 1. Initial Load: Load boundary GeoJSONs ONLY (NO auto-fetch prediction!)
  useEffect(() => {
    fetch('/maros.geojson')
      .then(res => res.json())
      .then(data => setMarosBoundary(data))
      .catch(err => console.error("Error loading Maros boundary:", err));

    fetch('/kecamatan.geojson')
      .then(res => res.json())
      .then(data => setKecamatanBoundary(data))
      .catch(err => console.error("Error loading Kecamatan boundary:", err));
  }, []);

  // Timer for detection loading progress
  useEffect(() => {
    let interval = null;
    if (loading) {
      setElapsedSec(0);
      interval = setInterval(() => {
        setElapsedSec(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // 2. On-demand detection execution via FastAPI
  const handleExecuteDetection = async () => {
    if (!date) {
      setError(lang === 'id' ? "Pilih tanggal citra terlebih dahulu." : "Please select an acquisition date.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const response = await axios.post(apiUrl, { date }, {
        headers: { 
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "69420"
        },
        timeout: 90000 // GEE + dual-stage deep learning takes ~20-30s
      });

      if (response.data && response.data.geojson) {
        setPrediction(response.data);
        setActiveSourceLabel(`Live GEE (${date})`);
        setSelectedKecamatan('');
      } else {
        throw new Error(lang === 'id' ? "Format respons tidak valid." : "Invalid response format.");
      }
    } catch (err) {
      console.warn("Detection request error:", err);
      const msg = err.response?.data?.detail || err.message || t.errorBackend;
      setError(`${msg} - ${t.errorBackend}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Benchmark Sample Scenarios (for quick portfolio review & CV demonstration)
  const handleLoadScenario = async (filename, label) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/demo-data/${filename}`);
      if (!res.ok) throw new Error("File not found");
      const data = await res.json();
      setPrediction(data);
      setActiveSourceLabel(label);
      setSelectedKecamatan('');
    } catch (err) {
      setError(lang === 'id' ? "Gagal memuat file skenario sampel." : "Failed to load sample scenario.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Reset detection to start fresh
  const handleResetDetection = () => {
    setPrediction(null);
    setActiveSourceLabel('');
    setSelectedKecamatan('');
    setError(null);
  };

  // 5. Compute Statistics & District Aggregations
  const stats = useMemo(() => {
    if (!prediction?.geojson?.features || prediction.geojson.features.length === 0) {
      return { totalHa: 0, polygonCount: 0, criticalDistrict: '-', districtBreakdown: [] };
    }

    const features = prediction.geojson.features;
    let totalHa = 0;
    const districtMap = {};

    features.forEach(f => {
      const props = f.properties || {};
      const districtName = props.daerah && props.daerah !== "Tidak Diketahui" ? props.daerah : "Wilayah Maros";
      const area = typeof props.area_ha === 'number' ? props.area_ha : parseFloat(props.area_ha || 0);
      const risk = props.risk_level || "Sedang";

      totalHa += area;

      if (!districtMap[districtName]) {
        districtMap[districtName] = {
          name: districtName,
          totalArea: 0,
          count: 0,
          highestRisk: risk
        };
      }
      districtMap[districtName].totalArea += area;
      districtMap[districtName].count += 1;
      // prioritize higher severity
      if (risk.toLowerCase().includes("sangat tinggi") || risk.toLowerCase().includes("very high")) {
        districtMap[districtName].highestRisk = "Sangat Tinggi";
      }
    });

    const breakdown = Object.values(districtMap).sort((a, b) => b.totalArea - a.totalArea);
    const critical = breakdown.length > 0 ? breakdown[0].name : '-';

    return {
      totalHa,
      polygonCount: features.length,
      criticalDistrict: critical,
      districtBreakdown: breakdown
    };
  }, [prediction]);

  // 6. Hazard Color Standard (BNPB Official Hazard Classification)
  const getRiskColor = (risk) => {
    if (!risk) return "#EAB308";
    const r = risk.toLowerCase();
    if (r.includes("sangat tinggi") || r.includes("very high")) return "#DC2626"; // BNPB Red
    if (r.includes("tinggi") || r.includes("high")) return "#EA580C";             // BNPB Orange
    if (r.includes("sedang") || r.includes("moderate")) return "#EAB308";         // BNPB Yellow/Amber
    if (r.includes("sangat rendah") || r.includes("very low")) return "#0284C7";  // BNPB Cyan/Blue
    if (r.includes("rendah") || r.includes("low")) return "#16A34A";             // BNPB Green
    return "#EAB308";
  };

  const getTranslatedRisk = (risk) => {
    if (!risk) return risk;
    const r = risk.toLowerCase();
    if (lang === 'en') {
      if (r.includes("sangat tinggi")) return "Very High";
      if (r.includes("tinggi")) return "High";
      if (r.includes("sedang")) return "Moderate";
      if (r.includes("sangat rendah")) return "Very Low";
      if (r.includes("rendah")) return "Low";
    }
    return risk;
  };

  // 7. Styling for Flood GeoJSON Polygons (Defined solidly with NO undefined reference)
  const getFloodPolygonStyle = (feature) => {
    const risk = feature?.properties?.risk_level || "Sedang";
    const color = getRiskColor(risk);
    return {
      color: color,
      weight: 1.8,
      opacity: 0.95,
      fillColor: color,
      fillOpacity: floodOpacity
    };
  };

  // 8. Interactive Feature Popup Formatting (Professional Attribute Table)
  const onEachFloodFeature = (feature, layer) => {
    const props = feature.properties || {};
    const district = props.daerah || "Maros";
    const rawRisk = props.risk_level || "Sedang";
    const riskLabel = getTranslatedRisk(rawRisk);
    const riskColor = getRiskColor(rawRisk);
    const area = props.area_ha ? `${parseFloat(props.area_ha).toFixed(2)} Ha` : "< 0.01 Ha";
    const source = props.source || "Dual-Stage Deep Learning";
    const satDate = prediction?.actual_sat_date || date;

    layer.bindPopup(`
      <div style="font-family: 'Inter', system-ui, sans-serif; min-width: 210px; padding: 2px;">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 3px;">
          ${t.popupTitle}
        </div>
        <div style="font-size: 15px; font-weight: 700; color: #38bdf8; margin-bottom: 8px; border-bottom: 1px solid #334155; padding-bottom: 4px;">
          Kec. ${district}
        </div>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="color: #94a3b8; padding: 2px 0;">${t.popupRisk}:</td>
            <td style="text-align: right; font-weight: 700; color: ${riskColor};">${riskLabel}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 2px 0;">${t.popupArea}:</td>
            <td style="text-align: right; font-weight: 600; color: #f8fafc;">${area}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 2px 0;">${t.popupDate}:</td>
            <td style="text-align: right; color: #cbd5e1; font-family: monospace;">${satDate}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 2px 0;">${t.popupSensor}:</td>
            <td style="text-align: right; color: #cbd5e1; font-size: 10px;">${source}</td>
          </tr>
        </table>
      </div>
    `);
  };

  // 9. Filtered GeoJSON for map rendering
  const filteredGeoJSON = useMemo(() => {
    if (!prediction?.geojson?.features) return null;
    if (!selectedKecamatan) return prediction.geojson;

    const filtered = prediction.geojson.features.filter(f => {
      const d = f.properties?.daerah || f.properties?.nm_kecamatan;
      return d && d.toLowerCase().replace(/\s+/g, '') === selectedKecamatan.toLowerCase().replace(/\s+/g, '');
    });

    return {
      type: "FeatureCollection",
      crs: prediction.geojson.crs,
      features: filtered
    };
  }, [prediction, selectedKecamatan]);

  // 10. Filtered Kecamatan Boundary for highlighting selected district
  const filteredKecamatanBoundary = useMemo(() => {
    if (!kecamatanBoundary?.features) return null;
    if (!selectedKecamatan) return kecamatanBoundary;

    return {
      type: "FeatureCollection",
      features: kecamatanBoundary.features.filter(f => {
        const name = f.properties?.nm_kecamatan;
        return name && name.toLowerCase().replace(/\s+/g, '') === selectedKecamatan.toLowerCase().replace(/\s+/g, '');
      })
    };
  }, [kecamatanBoundary, selectedKecamatan]);

  // 11. GeoJSON Exporter
  const handleExportGeoJSON = () => {
    if (!prediction?.geojson) return;
    const blob = new Blob([JSON.stringify(prediction.geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WebGIS_Banjir_Maros_${prediction.actual_sat_date || date}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 12. Copy Executive Brief to Clipboard
  const handleCopyBrief = () => {
    const isId = lang === 'id';
    const text = isId
      ? `LAPORAN INTELIJEN BENCANA BANJIR KABUPATEN MAROS\n` +
        `Tanggal Citra: ${prediction?.actual_sat_date || date}\n` +
        `Platform: Sentinel-1 SAR & Sentinel-2 MSI (GEE)\n` +
        `Model: Cascaded Deep Learning (CNN EfficientNet-B4 + Mask R-CNN ResNet-101)\n` +
        `Tingkat Bahaya Tertinggi: ${prediction?.risk_level || 'Sangat Tinggi'}\n` +
        `Total Luas Terdelinasi: ${stats.totalHa.toFixed(2)} Hektar\n` +
        `Jumlah Poligon Genangan: ${stats.polygonCount} Zona\n` +
        `Kecamatan Terdampak Terluas: ${stats.criticalDistrict}\n` +
        `Sistem: WebGIS Deteksi Banjir Maros (Saddam Alfarauq, 2026)`
      : `MAROS REGENCY FLOOD DISASTER INTELLIGENCE BRIEF\n` +
        `Acquisition Date: ${prediction?.actual_sat_date || date}\n` +
        `Platform: Sentinel-1 SAR & Sentinel-2 MSI (GEE)\n` +
        `Architecture: Cascaded Deep Learning (CNN EfficientNet-B4 + Mask R-CNN ResNet-101)\n` +
        `Peak Hazard Level: ${getTranslatedRisk(prediction?.risk_level) || 'Very High'}\n` +
        `Total Delineated Extent: ${stats.totalHa.toFixed(2)} Hectares\n` +
        `Delineated Zones: ${stats.polygonCount} Polygons\n` +
        `Most Affected District: ${stats.criticalDistrict}\n` +
        `System: Maros Flood Monitoring WebGIS (Saddam Alfarauq, 2026)`;

    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="flex h-screen w-full bg-[#0a0f1d] text-slate-100 overflow-hidden font-sans">
      
      {/* =========================================================================
          LEFT SIDEBAR: GIS CONTROL & ANALYSIS CENTER
          ========================================================================= */}
      <aside 
        className={`${
          sidebarOpen ? 'w-full md:w-[460px] xl:w-[500px]' : 'w-0'
        } h-full bg-[#0f172a] border-r border-slate-700/80 flex flex-col z-[1000] shadow-2xl transition-all duration-300 relative shrink-0 overflow-hidden`}
      >
        {/* Header: Institutional Branding */}
        <div className="px-5 py-4 border-b border-slate-700 bg-slate-900/90 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold tracking-widest uppercase text-blue-400 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>{t.agencyTag}</span>
              </div>
              <h1 className="text-base font-bold text-white tracking-tight leading-snug">
                {t.appTitle}
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                {t.appSubtitle}
              </p>
            </div>

            {/* Language Switcher & Mobile Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                title="Ganti Bahasa / Switch Language"
              >
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>{lang === 'id' ? 'EN' : 'ID'}</span>
              </button>

              <button 
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                aria-label="Tutup Sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Bar & Backend Endpoint Selector */}
          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : (prediction ? 'bg-emerald-400' : 'bg-blue-400')}`} />
              <span className="text-slate-300 font-medium">
                {loading ? `${t.statusProcessing} (${elapsedSec}s)` : (prediction ? (activeSourceLabel || t.statusReady) : t.statusReady)}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCustomApiInput(apiUrl);
                  setPingResult(null);
                  setShowApiModal(true);
                }}
                className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 border border-slate-700 px-2 py-0.5 rounded flex items-center gap-1 cursor-pointer transition-colors"
                title={t.btnApiSettings}
              >
                <Server className="w-3 h-3 text-cyan-400" />
                <span className="font-mono text-[9.5px]">
                  {apiUrl.includes('ngrok') ? 'Ngrok' : (apiUrl.includes('localhost') ? 'Local:8000' : 'API')}
                </span>
              </button>

              {prediction && (
                <button 
                  onClick={handleResetDetection}
                  className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer hover:underline"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t.btnResetDetection}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Main Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 text-sm custom-scrollbar">

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/70 border border-rose-800 text-rose-200 rounded-lg text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">{lang === 'id' ? 'Pemberitahuan Sistem:' : 'System Notice:'}</span>
                {error}
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-100">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* =================================================================
              SECTION 1: PARAMETER & DETEKSI SATELIT
              ================================================================= */}
          <section className="bg-slate-800/80 rounded-lg border border-slate-700 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>{t.secSatellite}</span>
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1 font-medium">
                {t.labelDate}
              </label>
              <div className="flex gap-2">
                <input 
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                  onClick={handleExecuteDetection}
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white px-4 py-2 rounded text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shrink-0 disabled:cursor-not-allowed shadow"
                >
                  {loading ? (
                    <>
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t.btnDetecting}</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>{t.btnDetect}</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {t.dateHint}
              </p>
            </div>

            {/* Benchmark Samples for Instant Review */}
            <div className="pt-2 border-t border-slate-700/80">
              <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                {t.sampleScenarios}
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleLoadScenario('demo_prediction.json', t.scenario1)}
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-700/80 border border-slate-600/80 text-slate-200 text-left px-2.5 py-2 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="text-amber-400 font-bold block mb-0.5">● {t.scenario1}</span>
                  <span className="text-[10px] text-slate-400">{t.scenario1Sub}</span>
                </button>
                <button
                  onClick={() => handleLoadScenario('demo_prediction_moderate.json', t.scenario2)}
                  disabled={loading}
                  className="bg-slate-900 hover:bg-slate-700/80 border border-slate-600/80 text-slate-200 text-left px-2.5 py-2 rounded text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="text-blue-400 font-bold block mb-0.5">● {t.scenario2}</span>
                  <span className="text-[10px] text-slate-400">{t.scenario2Sub}</span>
                </button>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 2: HASIL ANALISIS SPASIAL & STATISTIK
              ================================================================= */}
          <section className="bg-slate-800/80 rounded-lg border border-slate-700 p-4 space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-blue-400" />
                <span>{t.secAnalysis}</span>
              </div>
              {prediction && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 font-mono">
                  {prediction.actual_sat_date || date}
                </span>
              )}
            </div>

            {/* State: No prediction yet */}
            {!prediction ? (
              <div className="py-6 px-4 text-center rounded border border-dashed border-slate-700 bg-slate-900/40">
                <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                <div className="text-xs font-semibold text-slate-300 mb-1">
                  {t.emptyAnalysisTitle}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                  {t.emptyAnalysisDesc}
                </p>
              </div>
            ) : (
              <>
                {/* KPI Metrics Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="bg-slate-900/90 p-3 rounded border border-slate-700">
                    <div className="text-[11px] text-slate-400 mb-0.5">{t.kpiTotalArea}</div>
                    <div className="text-lg font-bold text-white font-mono">
                      {stats.totalHa.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 1 })} <span className="text-xs font-normal text-slate-400">Ha</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded border border-slate-700">
                    <div className="text-[11px] text-slate-400 mb-0.5">{t.kpiPolygons}</div>
                    <div className="text-lg font-bold text-white font-mono">
                      {stats.polygonCount} <span className="text-xs font-normal text-slate-400">Zona</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded border border-slate-700">
                    <div className="text-[11px] text-slate-400 mb-0.5">{t.kpiCriticalArea}</div>
                    <div className="text-sm font-bold text-amber-400 truncate" title={stats.criticalDistrict}>
                      {stats.criticalDistrict}
                    </div>
                  </div>

                  <div className="bg-slate-900/90 p-3 rounded border border-slate-700">
                    <div className="text-[11px] text-slate-400 mb-0.5">{t.kpiHazardLevel}</div>
                    <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: getRiskColor(prediction.risk_level) }}>
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getRiskColor(prediction.risk_level) }} />
                      <span>{getTranslatedRisk(prediction.risk_level) || 'Sangat Tinggi'}</span>
                    </div>
                  </div>
                </div>

                {/* District Filter Dropdown */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-300 font-medium block">
                    {t.filterDistrict}
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedKecamatan}
                      onChange={(e) => setSelectedKecamatan(e.target.value)}
                      className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="">{t.allDistricts}</option>
                      {KECAMATAN_LIST.map((kec, idx) => (
                        <option key={idx} value={kec}>
                          Kecamatan {kec}
                        </option>
                      ))}
                    </select>
                    {selectedKecamatan && (
                      <button
                        onClick={() => setSelectedKecamatan('')}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
                        title={t.btnResetFilter}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* District Breakdown Table */}
                {stats.districtBreakdown.length > 0 && (
                  <div className="border border-slate-700 rounded overflow-hidden">
                    <div className="px-3 py-2 bg-slate-900 border-b border-slate-700 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-300">
                        {t.tableTitle} ({stats.districtBreakdown.length})
                      </span>
                      <span className="text-[10px] text-slate-400">{t.tableHint}</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-950/80 text-slate-400 sticky top-0 z-10 border-b border-slate-800">
                          <tr>
                            <th className="px-3 py-1.5 font-medium">{t.colKecamatan}</th>
                            <th className="px-3 py-1.5 font-medium">{t.colArea}</th>
                            <th className="px-3 py-1.5 font-medium text-right">{t.colRisk}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                          {stats.districtBreakdown.map((item, idx) => {
                            const isSelected = selectedKecamatan.toLowerCase() === item.name.toLowerCase();
                            return (
                              <tr
                                key={idx}
                                onClick={() => setSelectedKecamatan(isSelected ? '' : item.name)}
                                className={`hover:bg-slate-800/80 transition-colors cursor-pointer ${
                                  isSelected ? 'bg-blue-950/80 text-white font-semibold' : 'text-slate-300'
                                }`}
                              >
                                <td className="px-3 py-2">
                                  {item.name}
                                </td>
                                <td className="px-3 py-2 font-mono">
                                  {item.totalArea.toFixed(2)}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  <span 
                                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                    style={{
                                      backgroundColor: `${getRiskColor(item.highestRisk)}20`,
                                      color: getRiskColor(item.highestRisk),
                                      border: `1px solid ${getRiskColor(item.highestRisk)}40`
                                    }}
                                  >
                                    {getTranslatedRisk(item.highestRisk)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Export & Sharing Tools */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleExportGeoJSON}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>{t.btnDownloadGeoJSON}</span>
                  </button>

                  <button
                    onClick={handleCopyBrief}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-600 px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copySuccess ? (
                      <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.copied}</span>
                      </span>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>{t.btnCopyBrief}</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </section>

          {/* =================================================================
              SECTION 3: MANAJEMEN LAPISAN & KARTOGRAFI
              ================================================================= */}
          <section className="bg-slate-800/80 rounded-lg border border-slate-700 p-4 space-y-3.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>{t.secLayers}</span>
            </div>

            {/* Basemap Selection */}
            <div>
              <label className="text-xs text-slate-400 block mb-1.5 font-medium">
                {t.basemapTitle}
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setBasemap('satellite')}
                  className={`p-2 rounded border text-xs text-center transition-colors cursor-pointer ${
                    basemap === 'satellite' 
                      ? 'bg-blue-950 border-blue-500 text-blue-300 font-semibold' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t.basemapSat}
                </button>
                <button
                  onClick={() => setBasemap('dark')}
                  className={`p-2 rounded border text-xs text-center transition-colors cursor-pointer ${
                    basemap === 'dark' 
                      ? 'bg-blue-950 border-blue-500 text-blue-300 font-semibold' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t.basemapDark}
                </button>
                <button
                  onClick={() => setBasemap('osm')}
                  className={`p-2 rounded border text-xs text-center transition-colors cursor-pointer ${
                    basemap === 'osm' 
                      ? 'bg-blue-950 border-blue-500 text-blue-300 font-semibold' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  {t.basemapOsm}
                </button>
              </div>
            </div>

            {/* Layer Visibility Toggles */}
            <div className="space-y-2 pt-1 border-t border-slate-700/80">
              <span className="text-xs text-slate-400 block mb-1 font-medium">
                {t.layerTogglesTitle}
              </span>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={showMaros}
                  onChange={(e) => setShowMaros(e.target.checked)}
                  className="rounded border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>{t.layerMarosBoundary}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={showKecamatan}
                  onChange={(e) => setShowKecamatan(e.target.checked)}
                  className="rounded border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>{t.layerKecamatanBoundary}</span>
              </label>

              <label className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={showFlood}
                  onChange={(e) => setShowFlood(e.target.checked)}
                  className="rounded border-slate-600 text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span>{t.layerFloodPolygons}</span>
              </label>
            </div>

            {/* Polygon Opacity Slider */}
            {prediction && showFlood && (
              <div className="pt-2 border-t border-slate-700/80">
                <div className="flex justify-between text-xs text-slate-300 mb-1">
                  <span>{t.labelOpacity}</span>
                  <span className="font-mono">{Math.round(floodOpacity * 100)}%</span>
                </div>
                <input 
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={floodOpacity}
                  onChange={(e) => setFloodOpacity(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 bg-slate-900 cursor-pointer"
                />
              </div>
            )}
          </section>

          {/* =================================================================
              SECTION 4: LEGENDA KLASIFIKASI BAHAYA (BNPB)
              ================================================================= */}
          <section className="bg-slate-800/80 rounded-lg border border-slate-700 p-4 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <span>{t.secLegend}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#DC2626] border border-white/20 shrink-0" />
                <span className="text-slate-300">{t.legendVeryHigh}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#EA580C] border border-white/20 shrink-0" />
                <span className="text-slate-300">{t.legendHigh}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#EAB308] border border-white/20 shrink-0" />
                <span className="text-slate-300">{t.legendModerate}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#16A34A] border border-white/20 shrink-0" />
                <span className="text-slate-300">{t.legendLow}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-sm bg-[#0284C7] border border-white/20 shrink-0" />
                <span className="text-slate-300">{t.legendVeryLow}</span>
              </div>
            </div>
          </section>

          {/* =================================================================
              SECTION 5: VALIDASI METODOLOGI & EXPLAINABLE AI
              ================================================================= */}
          <section className="bg-slate-800/80 rounded-lg border border-slate-700 p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span>{t.secXai}</span>
            </div>

            <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <div className="font-semibold text-slate-200">{t.xaiTitle}</div>
              <p className="text-[11px] text-slate-400">
                • {t.xaiStage1}
              </p>
              <p className="text-[11px] text-slate-400">
                • {t.xaiStage2}
              </p>
              <p className="text-[11px] text-slate-400">
                • {t.xaiTensor}
              </p>
            </div>

            <button
              onClick={() => setShowXaiModal(true)}
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 border border-slate-600 px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-blue-400" />
              <span>{t.btnOpenXaiModal}</span>
            </button>
          </section>

        </div>

        {/* Footer Info */}
        <div className="px-5 py-3 border-t border-slate-700 bg-slate-900 text-center shrink-0">
          <p className="text-[11px] text-slate-400">
            {t.footerThesis}
          </p>
        </div>
      </aside>

      {/* =========================================================================
          RIGHT MAIN: LEAFLET MAP CANVAS
          ========================================================================= */}
      <main className="flex-1 relative h-full w-full bg-[#080d1a]">
        
        {/* Mobile floating toggle button */}
        {!sidebarOpen && (
          <button 
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-[1000] bg-slate-900/90 hover:bg-slate-800 text-blue-400 p-2.5 rounded-lg border border-slate-700 shadow-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
            title="Buka Menu"
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Menu GIS</span>
          </button>
        )}

        {/* Floating Quick Action Bar */}
        <div className="absolute top-4 right-4 z-[1000] flex items-center gap-2">
          {/* Quick Language Toggle */}
          <button 
            onClick={() => setLang(lang === 'id' ? 'en' : 'id')}
            className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>{lang.toUpperCase()}</span>
          </button>

          {/* Quick XAI Trigger */}
          <button 
            onClick={() => setShowXaiModal(true)}
            className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-2 rounded-lg text-xs font-medium shadow-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Explainable AI"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden sm:inline">Grad-CAM XAI</span>
          </button>

          {/* Quick Export Trigger */}
          {prediction && (
            <button 
              onClick={handleExportGeoJSON}
              className="bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700 p-2 rounded-lg text-xs shadow-lg transition-colors cursor-pointer"
              title={t.btnDownloadGeoJSON}
            >
              <Download className="w-4 h-4 text-blue-400" />
            </button>
          )}
        </div>

        {/* Leaflet Map */}
        <MapContainer 
          center={[-5.0138, 119.5531]} 
          zoom={11} 
          className="h-full w-full" 
          zoomControl={true}
        >
          {/* Scale Control */}
          <MapScaleControl />

          {/* Bounds Controller */}
          {prediction?.geojson && (
            <MapBoundsController 
              geojsonData={prediction.geojson} 
              selectedKecamatan={selectedKecamatan} 
            />
          )}

          {/* Basemaps */}
          {basemap === 'satellite' && (
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          )}

          {basemap === 'dark' && (
            <TileLayer
              attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
              url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=1c0476a9-e671-4323-8e2c-dd3fe9c83fdd"
            />
          )}

          {basemap === 'osm' && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {/* 1. Maros Regency Boundary */}
          {marosBoundary && showMaros && (
            <GeoJSON 
              key="maros-county-boundary"
              data={marosBoundary} 
              style={{
                color: "#38bdf8",
                weight: 2.2,
                opacity: 0.9,
                dashArray: "4, 4",
                fillOpacity: 0
              }}
            />
          )}

          {/* 2. District Boundaries */}
          {filteredKecamatanBoundary && showKecamatan && (
            <GeoJSON 
              key={`kecamatan-${selectedKecamatan || 'all'}`}
              data={filteredKecamatanBoundary} 
              style={{
                color: selectedKecamatan ? "#06b6d4" : "#94a3b8",
                weight: selectedKecamatan ? 3 : 1,
                opacity: selectedKecamatan ? 1 : 0.5,
                fillColor: "#06b6d4",
                fillOpacity: selectedKecamatan ? 0.12 : 0,
                dashArray: selectedKecamatan ? "" : "2, 3"
              }}
              onEachFeature={(feature, layer) => {
                const name = feature.properties?.nm_kecamatan;
                if (name) {
                  layer.bindTooltip(`Kec. ${name}`, {
                    permanent: !!selectedKecamatan,
                    direction: "center",
                    className: "bg-slate-900 text-slate-100 border border-slate-700 px-2 py-0.5 rounded text-xs font-semibold"
                  });
                }
              }}
            />
          )}

          {/* 3. Flood Polygons (Rendered with robust key and styling) */}
          {prediction && filteredGeoJSON && showFlood && (
            <GeoJSON 
              key={`flood-layer-${prediction.history_id || 'pred'}-${prediction.actual_sat_date || date}-${selectedKecamatan || 'all'}-${floodOpacity}`}
              data={filteredGeoJSON} 
              style={getFloodPolygonStyle}
              onEachFeature={onEachFloodFeature}
            />
          )}
        </MapContainer>
      </main>

      {/* =========================================================================
          EXPLAINABLE AI (XAI) SCIENTIFIC VALIDATION MODAL
          ========================================================================= */}
      {showXaiModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  <span>{t.xaiModalTitle}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {t.xaiModalSubtitle}
                </p>
              </div>
              <button 
                onClick={() => setShowXaiModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
              
              {/* XAI Image Demonstration */}
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-800 text-center">
                <img 
                  src="/xai_pixel_flood_explanation.png" 
                  alt="Explainable AI Grad-CAM Visual Validation"
                  className="w-full max-h-[420px] object-contain rounded mx-auto"
                />
                <span className="text-[11px] text-slate-400 mt-2 block font-mono">
                  Fig 1. Komparasi Sentinel-1 SAR (VV/VH), Sentinel-2 MSI, SRTM DEM Topografi, dan Grad-CAM Neural Attention Heatmap.
                </span>
              </div>

              {/* Scientific Rationales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-300">
                <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 space-y-1.5">
                  <div className="font-bold text-blue-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.xaiPoint1Title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t.xaiPoint1Desc}
                  </p>
                </div>

                <div className="bg-slate-800/80 p-4 rounded-lg border border-slate-700 space-y-1.5">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t.xaiPoint2Title}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {t.xaiPoint2Desc}
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
              <button 
                onClick={() => setShowXaiModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold cursor-pointer transition-colors"
              >
                {t.btnClose}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          BACKEND API ENDPOINT CONFIGURATION MODAL (NGROK / LOCALHOST)
          ========================================================================= */}
      {showApiModal && (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {t.apiModalTitle}
                  </h3>
                  <p className="text-[10.5px] text-slate-400">
                    {t.apiModalSubtitle}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowApiModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              
              {/* Active Endpoint Info */}
              <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">{t.apiActiveLabel}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    apiUrl.includes('ngrok') ? 'bg-indigo-950 text-indigo-300 border border-indigo-700' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {apiUrl.includes('ngrok') ? 'Ngrok Tunnel' : (apiUrl.includes('localhost') ? 'Localhost (Port 8000)' : 'Custom API')}
                  </span>
                </div>
                <div className="text-cyan-300 font-mono text-[11.5px] break-all select-all bg-slate-900/90 p-2 rounded border border-slate-700/60">
                  {apiUrl}
                </div>
              </div>

              {/* Endpoint Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-slate-300">
                  {lang === 'id' ? 'Sesuaikan URL Endpoint API:' : 'Customize API Endpoint URL:'}
                </label>
                <input
                  type="text"
                  value={customApiInput}
                  onChange={(e) => setCustomApiInput(e.target.value)}
                  placeholder={t.apiPlaceholder}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded px-3 py-2 text-xs font-mono text-slate-200 outline-none transition-colors"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] text-slate-400 block font-medium">
                  {lang === 'id' ? 'Pilihan Cepat (Quick Presets):' : 'Quick Presets:'}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomApiInput(DEFAULT_NGROK_API);
                      handleSaveApiUrl(DEFAULT_NGROK_API);
                    }}
                    className={`p-2 rounded border text-left text-[11px] transition-all cursor-pointer ${
                      apiUrl === DEFAULT_NGROK_API 
                        ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200 font-semibold shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-indigo-400 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span>{t.apiResetNgrok}</span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-mono block truncate">
                      frenzy-provolone-duvet.ngrok-free.dev
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCustomApiInput(DEFAULT_LOCAL_API);
                      handleSaveApiUrl(DEFAULT_LOCAL_API);
                    }}
                    className={`p-2 rounded border text-left text-[11px] transition-all cursor-pointer ${
                      apiUrl === DEFAULT_LOCAL_API 
                        ? 'bg-blue-950/70 border-blue-500 text-blue-200 font-semibold shadow-sm'
                        : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold text-blue-400 mb-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span>{t.apiResetLocal}</span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 font-mono block truncate">
                      http://localhost:8000/api/predict
                    </span>
                  </button>
                </div>
              </div>

              {/* Ping Test Button & Result */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleTestPing}
                  disabled={testingPing}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 rounded text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Activity className={`w-3.5 h-3.5 text-cyan-400 ${testingPing ? 'animate-spin' : ''}`} />
                  <span>{testingPing ? t.apiTestingPing : t.apiTestPing}</span>
                </button>

                {apiSaveAlert && (
                  <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>{t.apiSavedAlert}</span>
                  </span>
                )}
              </div>

              {pingResult && (
                <div className={`p-2.5 rounded text-[11px] flex items-center gap-2 border ${
                  pingResult.success ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200' : 'bg-rose-950/60 border-rose-800 text-rose-200'
                }`}>
                  {pingResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />}
                  <span>{pingResult.message}</span>
                </div>
              )}

              {/* Vercel Tunnel Explanation */}
              <div className="bg-slate-950/60 p-3 rounded border border-slate-800/80 text-[10.5px] text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-300 block mb-0.5">
                  {lang === 'id' ? '💡 Integrasi Ngrok + Vercel:' : '💡 Ngrok + Vercel Integration:'}
                </span>
                {lang === 'id' 
                  ? 'Saat membuka WebGIS di Vercel, jalankan "ngrok http 8000" di terminal laptop Anda. Permintaan prediksi dari Vercel otomatis diteruskan ke server FastAPI lokal melalui tunnel terenkripsi.' 
                  : 'When opening WebGIS on Vercel, run "ngrok http 8000" on your laptop. Prediction requests from Vercel are securely tunneled to your local FastAPI backend.'}
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end gap-2">
              <button 
                type="button"
                onClick={() => setShowApiModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer transition-colors"
              >
                {t.btnClose}
              </button>
              <button 
                type="button"
                onClick={() => {
                  handleSaveApiUrl();
                  setShowApiModal(false);
                }}
                className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{t.apiSave}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
