import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Activity, TreePine, TrendingUp, Battery, Wifi, Thermometer, Droplets, DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Brain, BarChart3, Target, Zap, Home, Monitor, Settings, Bell } from 'lucide-react';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

// Utility function for API calls
const apiCall = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
};

// Format timestamp for display
const formatTimestamp = (timestamp) => {
  return new Date(timestamp).toLocaleString('id-ID', {
    timeZone: 'Etc/GMT-7',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Device Status Card Component
const DeviceStatusCard = ({ device, latestReading }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'offline': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBatteryColor = (voltage) => {
    if (voltage > 4.0) return 'text-green-600';
    if (voltage > 3.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSignalStrength = (rssi) => {
    if (rssi > -50) return { strength: 'Excellent', color: 'text-green-600' };
    if (rssi > -60) return { strength: 'Good', color: 'text-yellow-600' };
    if (rssi > -70) return { strength: 'Fair', color: 'text-orange-600' };
    return { strength: 'Poor', color: 'text-red-600' };
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{device.device_name || device.device_id}</h3>
          <p className="text-sm text-gray-600">{device.location}</p>
          <p className="text-xs text-gray-500">{device.tree_species}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(device.status)}`}>
          {device.status || 'Unknown'}
        </span>
      </div>

      {latestReading && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center">
            <TreePine className="w-8 h-8 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {latestReading.diameter_mm ? `${latestReading.diameter_mm.toFixed(1)}mm` : 'N/A'}
            </p>
            <p className="text-xs text-gray-500">Diameter</p>
          </div>
          <div className="text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-blue-600 mb-1" />
            <p className="text-2xl font-bold text-gray-900">
              {latestReading.growth_rate_mm_per_hour ? `${(latestReading.growth_rate_mm_per_hour * 24).toFixed(3)}` : '0.000'}
            </p>
            <p className="text-xs text-gray-500">mm/day</p>
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center">
            <Battery className={`w-4 h-4 mr-1 ${latestReading?.battery_voltage ? getBatteryColor(latestReading.battery_voltage) : 'text-gray-400'}`} />
            <span>{latestReading?.battery_voltage ? `${latestReading.battery_voltage.toFixed(1)}V` : 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Wifi className={`w-4 h-4 mr-1 ${latestReading?.wifi_rssi ? getSignalStrength(latestReading.wifi_rssi).color : 'text-gray-400'}`} />
            <span>{latestReading?.wifi_rssi ? `${latestReading.wifi_rssi}dBm` : 'N/A'}</span>
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1 text-gray-500" />
            <span>{latestReading?.time ? formatTimestamp(latestReading.time).split(' ')[1] : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Environmental Data Card
const EnvironmentalCard = ({ latestReading }) => {
  if (!latestReading) return null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Kondisi Lingkungan</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <Thermometer className="w-8 h-8 mx-auto text-red-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {latestReading.temperature_c ? `${latestReading.temperature_c.toFixed(1)}°C` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Suhu</p>
        </div>
        <div className="text-center">
          <Droplets className="w-8 h-8 mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {latestReading.humidity_percent ? `${latestReading.humidity_percent.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Kelembaban</p>
        </div>
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {latestReading.soil_moisture_percent ? `${latestReading.soil_moisture_percent.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Kelembaban Tanah</p>
        </div>
      </div>
    </div>
  );
};

// Growth Chart Component
const GrowthChart = ({ historyData, deviceId }) => {
  if (!historyData || historyData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pemantauan Pertumbuhan</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          Data pertumbuhan tidak tersedia
        </div>
      </div>
    );
  }

  // Prepare data for chart
  const chartData = historyData.map(reading => ({
    time: formatTimestamp(reading.time).split(' ')[1], // Only show time
    diameter: reading.diameter_mm || 0,
    temperature: reading.temperature_c || 0,
    humidity: reading.humidity_percent || 0
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Pemantauan Pertumbuhan - {deviceId}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="diameter" stroke="#059669" strokeWidth={2} name="Diameter (mm)" />
            <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#dc2626" strokeWidth={1} name="Temperature (°C)" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// Carbon Credit Calculator Component
const CarbonCreditCard = ({ carbonMetrics, latestReading }) => {
  const [customPrice, setCustomPrice] = useState(225000); // IDR per ton CO2

  // Calculate current values if we have latest reading
  const calculateCarbonValue = (diameter) => {
    if (!diameter) return { carbonStock: 0, co2Equivalent: 0, creditValue: 0 };
    
    const dbhCm = diameter / 10;
    const estimatedHeight = 1.2 * Math.pow(dbhCm, 0.75);
    const agb = 0.0673 * Math.pow(Math.pow(dbhCm, 2) * estimatedHeight, 0.976);
    const carbonStock = agb * 0.47;
    const co2Equivalent = carbonStock * 3.67;
    const creditValue = (co2Equivalent / 1000) * customPrice;
    
    return { carbonStock, co2Equivalent, creditValue: creditValue };
  };

  const currentValues = latestReading?.diameter_mm ? 
    calculateCarbonValue(latestReading.diameter_mm) : 
    { carbonStock: 0, co2Equivalent: 0, creditValue: 0 };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Kalkulator Kredit Karbon</h3>
        <DollarSign className="w-6 h-6 text-green-600" />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Harga Karbon (IDR/ton CO2)
        </label>
        <input
          type="number"
          value={customPrice}
          onChange={(e) => setCustomPrice(Number(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          min="1"
          max="100"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-green-50 rounded">
          <p className="text-2xl font-bold text-green-700">
            {currentValues.carbonStock.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600">kg Stok Karbon</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <p className="text-2xl font-bold text-blue-700">
            {currentValues.co2Equivalent.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600">kg Setara CO2</p>
        </div>
      </div>

      <div className="text-center p-4 bg-yellow-50 rounded border-2 border-yellow-200">
        <p className="text-3xl font-bold text-yellow-700">
          Rp{currentValues.creditValue.toLocaleString('id-ID')}
        </p>
        <p className="text-sm text-gray-600">Nilai Kredit Karbon Saat Ini</p>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Perhitungan berdasarkan formula IPCC 2019 untuk Sengon</p>
        <p>• AGB = 0.0673 × ((DBH² × H)^0.976)</p>
        <p>• Stok Karbon = AGB × 0.47</p>
      </div>
    </div>
  );
};

// ML Growth Prediction Component
const MLGrowthPrediction = ({ deviceId, latestReading }) => {
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [predictionHours, setPredictionHours] = useState(24);

  // Mock ML prediction data (replace with actual API call)
  const generateMockPredictions = () => {
    const currentDiameter = latestReading?.diameter_mm || 45.2;
    const growthRate = latestReading?.growth_rate_mm_per_hour || 0.012;

    const predictions = [];
    for (let i = 1; i <= predictionHours; i++) {
      const predictedDiameter = currentDiameter + (growthRate * i * (0.9 + Math.random() * 0.2));
      predictions.push({
        hour: i,
        predicted_diameter: predictedDiameter,
        confidence: 0.85 + Math.random() * 0.1
      });
    }
    return predictions;
  };

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual ML API endpoint
      // const response = await apiCall(`/ml/predict/${deviceId}?hours=${predictionHours}`);

      // For now, use mock data
      setTimeout(() => {
        const mockData = generateMockPredictions();
        setPredictions(mockData);
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Error fetching ML predictions:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId && latestReading) {
      fetchPredictions();
    }
  }, [deviceId, predictionHours]);

  const chartData = predictions?.map(pred => ({
    hour: `+${pred.hour}h`,
    diameter: pred.predicted_diameter.toFixed(2),
    confidence: (pred.confidence * 100).toFixed(1)
  })) || [];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <Brain className="w-5 h-5 mr-2 text-purple-600" />
          Prediksi Pertumbuhan AI
        </h3>
        <select
          value={predictionHours}
          onChange={(e) => setPredictionHours(Number(e.target.value))}
          className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value={12}>12 Jam</option>
          <option value={24}>24 Jam</option>
          <option value={48}>48 Jam</option>
          <option value={72}>72 Jam</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Brain className="w-8 h-8 animate-pulse text-purple-600" />
          <span className="ml-2 text-gray-600">Menganalisis data...</span>
        </div>
      ) : predictions ? (
        <div>
          <div className="h-64 mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip formatter={(value, name) => [
                  name === 'diameter' ? `${value} mm` : `${value}%`,
                  name === 'diameter' ? 'Diameter Prediksi' : 'Tingkat Kepercayaan'
                ]} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="diameter"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  name="Diameter Prediksi (mm)"
                  dot={{ fill: '#7c3aed', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-purple-50 rounded">
              <p className="text-lg font-bold text-purple-700">
                {predictions[predictions.length - 1]?.predicted_diameter.toFixed(2)} mm
              </p>
              <p className="text-xs text-gray-600">Diameter Prediksi</p>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <p className="text-lg font-bold text-green-700">
                {((predictions[predictions.length - 1]?.predicted_diameter - (latestReading?.diameter_mm || 0)) * 1000).toFixed(0)} μm
              </p>
              <p className="text-xs text-gray-600">Pertumbuhan Prediksi</p>
            </div>
            <div className="p-3 bg-blue-50 rounded">
              <p className="text-lg font-bold text-blue-700">
                {(predictions.reduce((sum, pred) => sum + pred.confidence, 0) / predictions.length * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">Akurasi Model</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Brain className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Data tidak tersedia untuk prediksi</p>
        </div>
      )}
    </div>
  );
};

// ML Health Assessment Component
const MLHealthAssessment = ({ deviceId, latestReading }) => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock health assessment data
  const generateMockHealthData = () => {
    const growthRate = latestReading?.growth_rate_mm_per_hour || 0.012;
    const temp = latestReading?.temperature_c || 25;
    const humidity = latestReading?.humidity_percent || 60;
    const soilMoisture = latestReading?.soil_moisture_percent || 55;

    // Simple health scoring algorithm
    let healthScore = 0;
    let status = 'sehat';
    let recommendations = [];

    // Growth rate assessment (optimal: 0.01-0.02 mm/h)
    if (growthRate >= 0.01 && growthRate <= 0.02) {
      healthScore += 25;
    } else if (growthRate < 0.005) {
      healthScore += 5;
      recommendations.push('Laju pertumbuhan rendah - periksa kondisi tanah');
    } else {
      healthScore += 15;
    }

    // Temperature assessment (optimal: 22-28°C)
    if (temp >= 22 && temp <= 28) {
      healthScore += 25;
    } else if (temp < 20 || temp > 32) {
      healthScore += 5;
      recommendations.push('Suhu tidak optimal untuk pertumbuhan Sengon');
    } else {
      healthScore += 15;
    }

    // Humidity assessment (optimal: 60-80%)
    if (humidity >= 60 && humidity <= 80) {
      healthScore += 25;
    } else {
      healthScore += 10;
      recommendations.push('Kelembaban udara perlu dioptimalkan');
    }

    // Soil moisture assessment (optimal: >50%)
    if (soilMoisture >= 50) {
      healthScore += 25;
    } else {
      healthScore += 5;
      recommendations.push('Kelembaban tanah rendah - perlu penyiraman');
    }

    if (healthScore >= 85) status = 'sangat_sehat';
    else if (healthScore >= 70) status = 'sehat';
    else if (healthScore >= 50) status = 'perlu_perhatian';
    else status = 'berisiko';

    return {
      overall_score: healthScore,
      status: status,
      metrics: {
        growth_health: growthRate >= 0.01 && growthRate <= 0.02 ? 'optimal' : 'sub_optimal',
        environmental_health: temp >= 22 && temp <= 28 && humidity >= 60 && humidity <= 80 ? 'optimal' : 'sub_optimal',
        water_stress: soilMoisture >= 50 ? 'low' : 'high',
        anomaly_risk: Math.random() > 0.8 ? 'high' : 'low'
      },
      recommendations: recommendations.length > 0 ? recommendations : ['Kondisi pohon dalam keadaan optimal']
    };
  };

  const fetchHealthAssessment = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual ML API endpoint
      // const response = await apiCall(`/ml/health/${deviceId}`);

      // For now, use mock data
      setTimeout(() => {
        const mockData = generateMockHealthData();
        setHealthData(mockData);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching health assessment:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId && latestReading) {
      fetchHealthAssessment();
    }
  }, [deviceId]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'sangat_sehat': return 'text-green-700 bg-green-100';
      case 'sehat': return 'text-green-600 bg-green-50';
      case 'perlu_perhatian': return 'text-yellow-600 bg-yellow-50';
      case 'berisiko': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'sangat_sehat': case 'sehat': return <CheckCircle className="w-5 h-5" />;
      case 'perlu_perhatian': return <AlertTriangle className="w-5 h-5" />;
      case 'berisiko': return <XCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Target className="w-5 h-5 mr-2 text-green-600" />
        Penilaian Kesehatan AI
      </h3>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <Target className="w-8 h-8 animate-pulse text-green-600" />
          <span className="ml-2 text-gray-600">Menganalisis kesehatan...</span>
        </div>
      ) : healthData ? (
        <div className="space-y-4">
          {/* Overall Health Score */}
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(healthData.status)}`}>
              {getStatusIcon(healthData.status)}
              <span className="ml-1">Skor Kesehatan: {healthData.overall_score}/100</span>
            </div>
          </div>

          {/* Health Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pertumbuhan</span>
                <span className={`px-2 py-1 rounded text-xs ${healthData.metrics.growth_health === 'optimal' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {healthData.metrics.growth_health === 'optimal' ? 'Optimal' : 'Sub-optimal'}
                </span>
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lingkungan</span>
                <span className={`px-2 py-1 rounded text-xs ${healthData.metrics.environmental_health === 'optimal' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {healthData.metrics.environmental_health === 'optimal' ? 'Optimal' : 'Sub-optimal'}
                </span>
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Stres Air</span>
                <span className={`px-2 py-1 rounded text-xs ${healthData.metrics.water_stress === 'low' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {healthData.metrics.water_stress === 'low' ? 'Rendah' : 'Tinggi'}
                </span>
              </div>
            </div>
            <div className="p-3 border rounded">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Risiko Anomali</span>
                <span className={`px-2 py-1 rounded text-xs ${healthData.metrics.anomaly_risk === 'low' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {healthData.metrics.anomaly_risk === 'low' ? 'Rendah' : 'Tinggi'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Rekomendasi AI:</h4>
            <ul className="space-y-1">
              {healthData.recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-start">
                  <span className="text-blue-500 mr-2">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Data tidak tersedia untuk penilaian</p>
        </div>
      )}
    </div>
  );
};

// ML Analytics Summary Component
const MLAnalyticsSummary = ({ devices }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Mock analytics data
  const generateMockAnalytics = () => {
    return {
      model_performance: {
        growth_prediction_accuracy: 87.5,
        health_classification_accuracy: 92.3,
        anomaly_detection_precision: 89.1,
        last_model_update: new Date().toISOString()
      },
      insights: {
        total_predictions_today: Math.floor(Math.random() * 100) + 50,
        healthy_trees_percent: 78,
        trees_needing_attention: 3,
        average_growth_rate: 0.014,
        optimal_conditions_percent: 65
      },
      trends: [
        { period: 'Minggu ini', growth_rate: 0.014, health_score: 82 },
        { period: 'Minggu lalu', growth_rate: 0.012, health_score: 79 },
        { period: '2 minggu lalu', growth_rate: 0.013, health_score: 81 },
        { period: '3 minggu lalu', growth_rate: 0.011, health_score: 77 }
      ]
    };
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual ML analytics API
      setTimeout(() => {
        const mockData = generateMockAnalytics();
        setAnalyticsData(mockData);
        setLoading(false);
      }, 600);
    } catch (error) {
      console.error('Error fetching ML analytics:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [devices]);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <BarChart3 className="w-5 h-5 mr-2 text-indigo-600" />
        Ringkasan Analytics AI
      </h3>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <BarChart3 className="w-8 h-8 animate-pulse text-indigo-600" />
          <span className="ml-2 text-gray-600">Memuat analytics...</span>
        </div>
      ) : analyticsData ? (
        <div className="space-y-6">
          {/* Model Performance */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Performa Model AI</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-purple-50 rounded">
                <p className="text-lg font-bold text-purple-700">
                  {analyticsData.model_performance.growth_prediction_accuracy}%
                </p>
                <p className="text-xs text-gray-600">Akurasi Prediksi</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <p className="text-lg font-bold text-green-700">
                  {analyticsData.model_performance.health_classification_accuracy}%
                </p>
                <p className="text-xs text-gray-600">Klasifikasi Kesehatan</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded">
                <p className="text-lg font-bold text-orange-700">
                  {analyticsData.model_performance.anomaly_detection_precision}%
                </p>
                <p className="text-xs text-gray-600">Deteksi Anomali</p>
              </div>
            </div>
          </div>

          {/* Key Insights */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Wawasan Hari Ini</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm text-gray-600">Prediksi Hari Ini</span>
                <span className="font-semibold text-gray-900">{analyticsData.insights.total_predictions_today}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm text-gray-600">Pohon Sehat</span>
                <span className="font-semibold text-green-600">{analyticsData.insights.healthy_trees_percent}%</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm text-gray-600">Perlu Perhatian</span>
                <span className="font-semibold text-yellow-600">{analyticsData.insights.trees_needing_attention}</span>
              </div>
              <div className="flex items-center justify-between p-3 border rounded">
                <span className="text-sm text-gray-600">Laju Rata-rata</span>
                <span className="font-semibold text-blue-600">{analyticsData.insights.average_growth_rate} mm/h</span>
              </div>
            </div>
          </div>

          {/* Trends Chart */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Tren Minggu Terakhir</h4>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="growth_rate" stroke="#3b82f6" strokeWidth={2} name="Laju Pertumbuhan" />
                  <Line type="monotone" dataKey="health_score" stroke="#10b981" strokeWidth={2} name="Skor Kesehatan" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>Data analytics tidak tersedia</p>
        </div>
      )}
    </div>
  );
};

// Alerts Panel Component
const AlertsPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Peringatan Sistem</h3>
        <div className="text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>Tidak ada peringatan aktif</p>
        </div>
      </div>
    );
  }

  const getAlertIcon = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <AlertCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getAlertBgColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Peringatan Sistem</h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.slice(0, 10).map((alert, index) => (
          <div key={index} className={`p-3 rounded-md border ${getAlertBgColor(alert.severity)}`}>
            <div className="flex items-start space-x-3">
              {getAlertIcon(alert.severity)}
              <div className="flex-1">
                <p className="font-medium text-gray-900">{alert.message}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-600">{alert.device_id}</p>
                  <p className="text-xs text-gray-500">{formatTimestamp(alert.time)}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Dashboard Component
const SengonMonitoringDashboard = () => {
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [latestReading, setLatestReading] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [carbonMetrics, setCarbonMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Fetch devices on component mount
  useEffect(() => {
    const fetchDevices = async () => {
      const result = await apiCall('/devices');
      if (result && result.devices) {
        setDevices(result.devices);
        if (result.devices.length > 0) {
          setSelectedDevice(result.devices[0].device_id);
        }
      }
      setLoading(false);
    };

    fetchDevices();
  }, []);

  // Fetch device-specific data when selected device changes
  useEffect(() => {
    if (!selectedDevice) return;

    const fetchDeviceData = async () => {
      setLoading(true);
      
      // Fetch latest reading
      const latest = await apiCall(`/devices/${selectedDevice}/latest`);
      setLatestReading(latest);

      // Fetch history
      const history = await apiCall(`/devices/${selectedDevice}/history?hours=24`);
      if (history && history.readings) {
        setHistoryData(history.readings);
      }

      // Fetch carbon metrics
      const carbon = await apiCall(`/devices/${selectedDevice}/carbon`);
      if (carbon && carbon.carbon_metrics) {
        setCarbonMetrics(carbon.carbon_metrics);
      }

      setLoading(false);
    };

    fetchDeviceData();
  }, [selectedDevice]);

  // Fetch alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const result = await apiCall('/alerts');
      if (result && result.alerts) {
        setAlerts(result.alerts);
      }
    };

    fetchAlerts();
    
    // Set up polling for alerts
    const alertInterval = setInterval(fetchAlerts, 30000); // Every 30 seconds
    return () => clearInterval(alertInterval);
  }, []);

  // Auto-refresh latest data every minute
  useEffect(() => {
    if (!selectedDevice) return;

    const refreshInterval = setInterval(async () => {
      const latest = await apiCall(`/devices/${selectedDevice}/latest`);
      setLatestReading(latest);
    }, 60000); // Every minute

    return () => clearInterval(refreshInterval);
  }, [selectedDevice]);

  if (loading && devices.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 mx-auto text-green-600 animate-spin mb-4" />
          <p className="text-gray-600">Memuat Sistem Pemantauan Sengon...</p>
        </div>
      </div>
    );
  }

  const currentDevice = devices.find(d => d.device_id === selectedDevice);

  // Navigation menu items
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: Home },
    { id: 'monitoring', name: 'Pemantauan', icon: Monitor },
    { id: 'analytics', name: 'Analytics AI', icon: Brain },
    { id: 'carbon', name: 'Kredit Karbon', icon: DollarSign },
    { id: 'alerts', name: 'Peringatan', icon: Bell },
    { id: 'settings', name: 'Pengaturan', icon: Settings }
  ];

  // Function to render different pages
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return renderDashboardPage();
      case 'monitoring':
        return renderMonitoringPage();
      case 'analytics':
        return renderAnalyticsPage();
      case 'carbon':
        return renderCarbonPage();
      case 'alerts':
        return renderAlertsPage();
      case 'settings':
        return renderSettingsPage();
      default:
        return renderDashboardPage();
    }
  };

  const renderDashboardPage = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Device Status */}
        {currentDevice && (
          <DeviceStatusCard device={currentDevice} latestReading={latestReading} />
        )}

        {/* Environmental Conditions */}
        <EnvironmentalCard latestReading={latestReading} />
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* System Health Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Kesehatan Sistem</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Koneksi Database</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Broker MQTT</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Pemrosesan Data</span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Perangkat Aktif</span>
              <span className="text-sm font-medium text-gray-900">{devices.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMonitoringPage = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Monitor className="w-6 h-6 text-blue-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Pemantauan Real-time</h2>
      </div>

      {currentDevice && (
        <DeviceStatusCard device={currentDevice} latestReading={latestReading} />
      )}

      <EnvironmentalCard latestReading={latestReading} />
      <GrowthChart historyData={historyData} deviceId={selectedDevice} />
    </div>
  );

  const renderAnalyticsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Brain className="w-6 h-6 text-purple-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Analytics & Prediksi AI</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <MLGrowthPrediction deviceId={selectedDevice} latestReading={latestReading} />
        <MLHealthAssessment deviceId={selectedDevice} latestReading={latestReading} />
        <MLAnalyticsSummary devices={devices} />
      </div>
    </div>
  );

  const renderCarbonPage = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <DollarSign className="w-6 h-6 text-green-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Kalkulator Kredit Karbon</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CarbonCreditCard carbonMetrics={carbonMetrics} latestReading={latestReading} />
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Riwayat Kredit Karbon</h3>
          <div className="text-center text-gray-500 py-8">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p>Grafik riwayat kredit karbon</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAlertsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Bell className="w-6 h-6 text-red-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Manajemen Peringatan</h2>
      </div>

      <AlertsPanel alerts={alerts} />
    </div>
  );

  const renderSettingsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center mb-6">
        <Settings className="w-6 h-6 text-gray-600 mr-2" />
        <h2 className="text-xl font-bold text-gray-900">Pengaturan Sistem</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Perangkat</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Interval Pengukuran (menit)
              </label>
              <input
                type="number"
                defaultValue={15}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ambang Batas Suhu (°C)
              </label>
              <input
                type="number"
                defaultValue={32}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pengaturan Notifikasi</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Email Notifications</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">SMS Alerts</span>
              <input type="checkbox" className="toggle" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TreePine className="w-8 h-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Sistem Pemantauan Sengon
              </h1>
            </div>

            {devices.length > 0 && (
              <div className="flex items-center space-x-4">
                <select
                  value={selectedDevice || ''}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {devices.map(device => (
                    <option key={device.device_id} value={device.device_id}>
                      {device.device_name || device.device_id}
                    </option>
                  ))}
                </select>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  Langsung
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`flex items-center px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                    currentPage === item.id
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.name}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <TreePine className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Perangkat Tidak Ditemukan</h3>
            <p className="text-gray-600">Pastikan perangkat ESP32 Anda terhubung dan mengirim data.</p>
          </div>
        ) : (
          renderPage()
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2025 Sistem Pemantauan Sengon - Kehutanan Presisi dengan AIoT</p>
            <p>Terakhir diperbarui: {formatTimestamp(new Date().toISOString())}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SengonMonitoringDashboard;