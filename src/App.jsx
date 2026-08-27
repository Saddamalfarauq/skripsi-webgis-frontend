import React, { useState } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import axios from 'axios';

// Komponen untuk auto-zoom peta ke area banjir
function FlyToGeoJSON({ geojsonData }) {
  const map = useMap();
  React.useEffect(() => {
    if (geojsonData && geojsonData.features && geojsonData.features.length > 0) {
      import('leaflet').then(L => {
        const layer = L.geoJSON(geojsonData);
        map.fitBounds(layer.getBounds(), { padding: [50, 50] });
      });
    }
  }, [geojsonData, map]);
  return null;
}

function App() {
  const todayDate = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayDate);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [showFlood, setShowFlood] = useState(true);
  const [showMaros, setShowMaros] = useState(true);
  const [marosBoundary, setMarosBoundary] = useState(null);
  const [kecamatanBoundary, setKecamatanBoundary] = useState(null);
  
  // States baru untuk fitur UI
  const [showDetailPanel, setShowDetailPanel] = useState(true);
  const [selectedKecamatan, setSelectedKecamatan] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  React.useEffect(() => {
    // Memuat batas wilayah Maros
    fetch('/maros.geojson')
      .then(res => res.json())
      .then(data => setMarosBoundary(data))
      .catch(err => console.error("Gagal memuat batas wilayah Maros:", err));

    // Memuat batas kecamatan
    fetch('/kecamatan.geojson')
      .then(res => res.json())
      .then(data => setKecamatanBoundary(data))
      .catch(err => console.error("Gagal memuat batas kecamatan:", err));

    // Auto-fetch saat aplikasi pertama kali dibuka (untuk tanggal hari ini)
    const autoFetch = async () => {
      setLoading(true);
      try {
        const response = await axios.post("https://frenzy-provolone-duvet.ngrok-free.dev/api/predict", {
          date: todayDate
        }, {
          headers: { "Content-Type": "application/json" }
        });
        setPrediction(response.data);
        setShowDetailPanel(true);
        setSelectedKecamatan(null);
      } catch (err) {
        setError(err.response?.data?.detail || "Gagal auto-deteksi hari ini.");
      } finally {
        setLoading(false);
      }
    };
    
    autoFetch();
  }, []);

  const handleSearch = async () => {
    if (!date) {
      setError("Silakan pilih tanggal pencarian terlebih dahulu.");
      return;
    }
    
    setError(null);
    setLoading(true);
    setPrediction(null);
    
    try {
      const response = await axios.post("https://frenzy-provolone-duvet.ngrok-free.dev/api/predict", {
        date: date
      }, {
        headers: { "Content-Type": "application/json" }
      });
      setPrediction(response.data);
      setShowDetailPanel(true);
      setSelectedKecamatan(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Terjadi kesalahan saat memproses prediksi.");
    } finally {
      setLoading(false);
    }
  };

  // GeoJSON style berdasarkan Risk Level per-poligon
  const getStyle = (feature) => {
    let color = "#FF0000"; // default red
    const risk = feature.properties?.risk_level;
    if (risk) {
      const r = risk.toLowerCase();
      if (r.includes("sangat tinggi")) color = "#8B0000";
      else if (r.includes("tinggi")) color = "#FF0000";
      else if (r.includes("sedang")) color = "#FFA500";
      else if (r.includes("sangat rendah")) color = "#00FF00"; // Harus dicek sebelum "rendah"
      else if (r.includes("rendah")) color = "#FFFF00";
    }
    return {
      fillColor: color,
      weight: 3,
      opacity: 1,
      color: color,
      dashArray: '5, 5', // Garis putus-putus
      fillOpacity: 0.4
    };
  };

  const onEachFeature = (feature, layer) => {
    const daerahName = feature.properties?.daerah && feature.properties.daerah !== "Tidak Diketahui" 
      ? feature.properties.daerah 
      : "";
      
    if (daerahName) {
      layer.bindPopup(`
        <div style="text-align:center; font-family:'Outfit', sans-serif;">
          <span style="font-size:12px; color:#666;">Kecamatan</span><br>
          <strong style="font-size:16px;">${daerahName}</strong>
        </div>
      `);
    }
  };

  // Grouping data for affected areas table
  const getAffectedAreas = () => {
    if (!prediction || !prediction.geojson || !prediction.geojson.features) return [];
    
    const areas = {};
    prediction.geojson.features.forEach(f => {
      const props = f.properties || {};
      const daerah = props.daerah && props.daerah !== "Tidak Diketahui" ? props.daerah : "Lainnya";
      const risk = props.risk_level || "Unknown";
      const area = props.area_ha || 0;
      
      const key = `${daerah}-${risk}`;
      if (!areas[key]) {
        areas[key] = { daerah, risk, area: 0 };
      }
      areas[key].area += area;
    });
    
    return Object.values(areas).sort((a, b) => b.area - a.area);
  };

  const getRiskColor = (risk) => {
    const r = risk.toLowerCase();
    if (r.includes("sangat tinggi")) return "#8B0000";
    if (r.includes("tinggi")) return "#FF0000";
    if (r.includes("sedang")) return "#FFA500";
    if (r.includes("sangat rendah")) return "#00FF00";
    if (r.includes("rendah")) return "#FFFF00";
    return "#888888";
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[#121212] overflow-hidden font-sans text-gray-200">
      {/* Sidebar Panel - Dark Navy */}
      <div className="w-full md:w-[420px] h-[50vh] md:h-full bg-[#1a233a] flex flex-col z-[1000] relative border-t md:border-t-0 md:border-r border-[#2a3655] shadow-2xl shrink-0 order-2 md:order-1">
        
        {/* Header */}
        <div className="p-6 pb-4">
          <h1 className="text-2xl font-bold text-cyan-400">WebGIS Deteksi Banjir</h1>
          <p className="text-gray-400 text-sm mt-1 mb-4">Kabupaten Maros</p>
          <span className="bg-[#232d4b] text-cyan-400 text-xs font-semibold px-3 py-1 rounded-full border border-cyan-900">
            Model: CNN + Mask R-CNN
          </span>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar space-y-6">
          
          {/* Informasi Data Panel */}
          <div>
            <h2 className="text-xs font-bold text-gray-300 tracking-wider mb-3 uppercase">Informasi Data</h2>
            <div className="bg-[#232d4b] p-4 rounded-lg border border-[#2a3655] text-xs space-y-2">
              <p><span className="font-semibold text-white">Sumber:</span> Google Earth Engine</p>
              <p><span className="font-semibold text-white">Dataset:</span> Sentinel-1 GRD, Sentinel-2 MSI</p>
              <p><span className="font-semibold text-white">Tanggal Citra Tersedia:</span> {prediction?.actual_sat_date || "Menunggu Deteksi..."}</p>
            </div>
          </div>

          {/* Pencarian Historis Panel */}
          <div>
            <h2 className="text-xs font-bold text-gray-300 tracking-wider mb-3 uppercase">Pencarian Historis</h2>
            <div className="space-y-3">
              <div className="relative">
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#111827] border border-[#374151] text-gray-300 text-sm rounded-md focus:ring-cyan-500 focus:border-cyan-500 block p-2.5"
                />
              </div>

              <button 
                onClick={handleSearch}
                disabled={loading}
                className={`w-full py-2.5 rounded-md text-gray-900 font-bold text-sm transition-colors shadow-lg ${loading ? 'bg-cyan-700 cursor-not-allowed text-gray-300' : 'bg-cyan-400 hover:bg-cyan-300'}`}
              >
                {loading ? 'Mengunduh & Memproses GEE...' : 'Cari Data Satelit'}
              </button>

              {error && (
                <p className="text-xs text-red-400 mt-2 bg-red-900/20 p-2 rounded border border-red-800">{error}</p>
              )}

              {prediction && !loading && (
                <p className="text-xs text-green-400 mt-2">
                  Selesai! {prediction.geojson?.features?.length || 0} area terdeteksi.
                </p>
              )}
            </div>
          </div>

          {/* Navigasi & Filter Kecamatan Panel */}
          <div>
            <h2 className="text-xs font-bold text-gray-300 tracking-wider mb-3 uppercase">Navigasi & Filter Kecamatan</h2>
            <div className="space-y-2.5">
              <div className="relative flex items-center">
                <input 
                  type="text" 
                  list="kecamatan-list-react"
                  value={searchQuery}
                  placeholder="🔍 Cari & Pilih Kecamatan (14 Kecamatan)..."
                  className="w-full bg-[#111827]/80 backdrop-blur-md border border-[#374151] text-cyan-400 font-semibold text-xs rounded-md focus:ring-cyan-500 focus:border-cyan-500 block p-2.5 pr-8 placeholder-gray-500"
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchQuery(val);
                    const list = ["Bantimurung", "Bontoa", "Camba", "Cenrana", "Lau", "Mallawa", "Mandai", "Maros Baru", "Marusu", "Moncongloe", "Simbang", "Tanralili", "Tompobulu", "Turikale"];
                    const match = list.find(k => k.toLowerCase() === val.toLowerCase().trim());
                    if (match) {
                      setSelectedKecamatan(match);
                    } else if (!val.trim()) {
                      setSelectedKecamatan(null);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const list = ["Bantimurung", "Bontoa", "Camba", "Cenrana", "Lau", "Mallawa", "Mandai", "Maros Baru", "Marusu", "Moncongloe", "Simbang", "Tanralili", "Tompobulu", "Turikale"];
                      const match = list.find(k => k.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                      if (match) {
                        setSelectedKecamatan(match);
                        setSearchQuery(match);
                      }
                    }
                  }}
                />
                {searchQuery && (
                  <button 
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSelectedKecamatan(null);
                    }}
                    className="absolute right-2.5 text-gray-400 hover:text-cyan-400 font-bold text-xs p-1 cursor-pointer"
                    title="Hapus / Reset Pilihan"
                  >
                    ✕
                  </button>
                )}
                <datalist id="kecamatan-list-react">
                  {["Bantimurung", "Bontoa", "Camba", "Cenrana", "Lau", "Mallawa", "Mandai", "Maros Baru", "Marusu", "Moncongloe", "Simbang", "Tanralili", "Tompobulu", "Turikale"].map((k, i) => (
                    <option key={i} value={k}>Kecamatan {k}</option>
                  ))}
                </datalist>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button 
                  type="button"
                  onClick={() => {
                    const list = ["Bantimurung", "Bontoa", "Camba", "Cenrana", "Lau", "Mallawa", "Mandai", "Maros Baru", "Marusu", "Moncongloe", "Simbang", "Tanralili", "Tompobulu", "Turikale"];
                    const match = list.find(k => k.toLowerCase().includes(searchQuery.toLowerCase().trim()));
                    if (match) {
                      setSelectedKecamatan(match);
                      setSearchQuery(match);
                    } else if (!searchQuery.trim()) {
                      alert("Silakan cari atau pilih kecamatan terlebih dahulu.");
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-gray-950 font-bold py-2 px-3 rounded-md text-xs transition-all shadow-md active:scale-95"
                >
                  🎯 Filter Poligon
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedKecamatan(null);
                  }}
                  className="flex-1 bg-[#1e293b] hover:bg-[#2d3748] text-gray-300 hover:text-white border border-[#374151] font-semibold py-2 px-3 rounded-md text-xs transition-all active:scale-95"
                >
                  🔄 Reset Filter
                </button>
              </div>
            </div>
          </div>

          {/* Daerah Terdampak Panel */}
          {prediction && prediction.geojson?.features?.length > 0 && (
            <div>
              <h2 className="text-xs font-bold text-gray-300 tracking-wider mb-3 uppercase">Daerah Terdampak</h2>
              <div className="bg-[#232d4b] rounded-lg border border-[#2a3655] overflow-y-auto max-h-[220px] custom-scrollbar relative">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="text-xs text-gray-400 uppercase bg-[#1a233a] border-b border-[#2a3655] sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Kecamatan</th>
                      <th className="px-3 py-2 font-semibold">Luas (Ha)</th>
                      <th className="px-3 py-2 font-semibold text-center">Risiko</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getAffectedAreas().map((item, idx) => (
                      <tr 
                        key={idx} 
                        onClick={() => setSelectedKecamatan(selectedKecamatan === item.daerah ? null : item.daerah)}
                        className={`border-b border-[#2a3655] last:border-0 hover:bg-[#2a3655] transition-colors cursor-pointer ${selectedKecamatan === item.daerah ? 'bg-[#2a3655] border-l-2 border-l-cyan-400' : ''}`}
                        title="Klik untuk memfilter peta"
                      >
                        <td className="px-3 py-2 font-medium text-white flex items-center justify-between">
                          {item.daerah}
                          {selectedKecamatan === item.daerah && <span className="text-[10px] bg-cyan-900/50 text-cyan-400 px-1.5 py-0.5 rounded">Aktif</span>}
                        </td>
                        <td className="px-3 py-2">{item.area > 0 ? item.area.toFixed(2) : "< 0.01"}</td>
                        <td className="px-3 py-2 flex justify-center">
                          <div 
                            className="w-3.5 h-3.5 rounded-sm border border-gray-700 mt-0.5" 
                            style={{ backgroundColor: getRiskColor(item.risk) }}
                            title={item.risk}
                          ></div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kontrol Lapisan */}
          <div>
            <h2 className="text-xs font-bold text-gray-300 tracking-wider mb-3 uppercase">Kontrol Lapisan (Layers)</h2>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showMaros}
                  onChange={() => setShowMaros(!showMaros)}
                  className="form-checkbox h-4 w-4 text-cyan-500 rounded bg-[#111827] border-gray-600 focus:ring-cyan-500" 
                />
                <span className="text-sm text-gray-300">Batas Wilayah Maros</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showFlood}
                  onChange={() => setShowFlood(!showFlood)}
                  className="form-checkbox h-4 w-4 text-cyan-500 rounded bg-[#111827] border-gray-600 focus:ring-cyan-500" 
                />
                <span className="text-sm text-gray-300">Area Potensi Banjir</span>
              </label>
            </div>
          </div>

          {/* Legenda Risiko */}
          <div>
            <h2 className="text-xs font-bold text-gray-300 tracking-wider mb-3 uppercase">Legenda Risiko</h2>
            <div className="space-y-2">
              <div className="flex items-center"><div className="w-4 h-4 bg-[#8B0000] rounded-sm mr-3 border border-gray-700"></div><span className="text-sm text-gray-400">Sangat Tinggi</span></div>
              <div className="flex items-center"><div className="w-4 h-4 bg-[#FF0000] rounded-sm mr-3 border border-gray-700"></div><span className="text-sm text-gray-400">Tinggi</span></div>
              <div className="flex items-center"><div className="w-4 h-4 bg-[#FFA500] rounded-sm mr-3 border border-gray-700"></div><span className="text-sm text-gray-400">Sedang</span></div>
              <div className="flex items-center"><div className="w-4 h-4 bg-[#FFFF00] rounded-sm mr-3 border border-gray-700"></div><span className="text-sm text-gray-400">Rendah</span></div>
              <div className="flex items-center"><div className="w-4 h-4 bg-[#00FF00] rounded-sm mr-3 border border-gray-700"></div><span className="text-sm text-gray-400">Sangat Rendah</span></div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2a3655] text-center">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Sistem Informasi Geografis & Deep Learning<br/>Universitas - Skripsi 2026
          </p>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="flex-1 relative bg-[#0a0a0a] order-1 md:order-2 h-[50vh] md:h-full">
        <MapContainer center={[-5.0138, 119.5531]} zoom={11} className="h-full w-full" zoomControl={false}>
          {/* Stadia Alidade Smooth Dark (Free, Identical to CARTO Dark Matter) */}
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>'
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
          />
          {marosBoundary && showMaros && !selectedKecamatan && (
            <GeoJSON 
              data={marosBoundary} 
              style={{
                color: "#00FFFF", // Cyan color for Maros boundary
                weight: 3,
                opacity: 0.9,
                fillOpacity: 0
              }}
            />
          )}
          {kecamatanBoundary && showMaros && (
            <GeoJSON 
              key={selectedKecamatan || "all_kecamatan"}
              data={selectedKecamatan ? {
                ...kecamatanBoundary,
                features: (kecamatanBoundary.features || []).filter(f => 
                  f.properties && f.properties.nm_kecamatan && 
                  f.properties.nm_kecamatan.toLowerCase() === selectedKecamatan.toLowerCase()
                )
              } : kecamatanBoundary} 
              style={{
                color: "#00FFFF", // Cyan color for Kecamatan boundaries
                weight: selectedKecamatan ? 4 : 1,
                opacity: selectedKecamatan ? 1 : 0.5,
                fillColor: "#00FFFF",
                fillOpacity: selectedKecamatan ? 0.18 : 0,
                dashArray: selectedKecamatan ? "" : "4, 4"
              }}
              onEachFeature={(feature, layer) => {
                if (feature.properties && feature.properties.nm_kecamatan) {
                  layer.bindTooltip(feature.properties.nm_kecamatan, {
                    permanent: !!selectedKecamatan,
                    direction: "center",
                    className: "bg-[#1a233a] text-cyan-400 border border-[#2a3655] px-2 py-1 rounded text-xs font-bold shadow-lg"
                  });
                }
              }}
            />
          )}
          {prediction && prediction.geojson && showFlood && (
            <>
              <GeoJSON 
                key={(prediction.history_id || 'pred') + (selectedKecamatan || 'all')} 
                data={prediction.geojson} 
                style={getStyle}
                onEachFeature={onEachFeature}
                filter={(feature) => {
                  if (!selectedKecamatan) return true;
                  const daerah = feature.properties?.daerah;
                  return daerah && daerah.toLowerCase() === selectedKecamatan.toLowerCase();
                }}
              />
              <FlyToGeoJSON 
                geojsonData={{
                  ...prediction.geojson,
                  features: selectedKecamatan 
                    ? (prediction.geojson.features || []).filter(f => f.properties?.daerah && f.properties.daerah.toLowerCase() === selectedKecamatan.toLowerCase())
                    : (prediction.geojson.features || [])
                }} 
              />
            </>
          )}
        </MapContainer>
        
        {/* Floating Detail Area Panel (Hanya muncul jika ada prediksi) */}
        {prediction && showDetailPanel && (
          <div className="absolute top-4 right-4 md:top-auto md:bottom-8 md:right-8 z-[1000] bg-[#1a233a]/90 backdrop-blur-sm p-4 md:p-5 rounded-xl shadow-2xl border border-[#2a3655] w-56 md:w-72">
            <div className="flex justify-between items-center mb-4 border-b border-[#2a3655] pb-2">
              <h3 className="text-sm font-bold text-cyan-400">Detail Area</h3>
              <button 
                onClick={() => setShowDetailPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
                title="Tutup Panel"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Tingkat Risiko:</span>
                <span className="font-bold text-white capitalize">{prediction.risk_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Confidence:</span>
                <span className="font-bold text-white">{(prediction.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Sumber:</span>
                <span className="font-bold text-white">CNN + Mask R-CNN</span>
              </div>
            </div>
          </div>
        )}

        {/* Tombol untuk memunculkan kembali Detail Panel jika ditutup */}
        {prediction && !showDetailPanel && (
          <button 
            onClick={() => setShowDetailPanel(true)}
            className="absolute top-4 right-4 md:top-auto md:bottom-8 md:right-8 z-[1000] bg-[#1a233a]/90 hover:bg-[#2a3655] backdrop-blur-sm text-cyan-400 p-3 rounded-full shadow-2xl border border-[#2a3655] transition-all flex items-center justify-center animate-pulse"
            title="Tampilkan Detail Area"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
