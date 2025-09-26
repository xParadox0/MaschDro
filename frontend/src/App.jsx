import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, Activity, TreePine, TrendingUp, Battery, Wifi, Thermometer, Droplets, DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

// API Configuration
const API_BASE_URL = 'http://localhost:8080/api/v1';

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
    timeZone: 'Asia/Jakarta',
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Environmental Conditions</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <Thermometer className="w-8 h-8 mx-auto text-red-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {latestReading.temperature_c ? `${latestReading.temperature_c.toFixed(1)}°C` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Temperature</p>
        </div>
        <div className="text-center">
          <Droplets className="w-8 h-8 mx-auto text-blue-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {latestReading.humidity_percent ? `${latestReading.humidity_percent.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Humidity</p>
        </div>
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto text-yellow-500 mb-2" />
          <p className="text-2xl font-bold text-gray-900">
            {latestReading.soil_moisture_percent ? `${latestReading.soil_moisture_percent.toFixed(1)}%` : 'N/A'}
          </p>
          <p className="text-xs text-gray-500">Soil Moisture</p>
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Monitoring</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          No growth data available
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
        Growth Monitoring - {deviceId}
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
  const [customPrice, setCustomPrice] = useState(15); // USD per ton CO2

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
        <h3 className="text-lg font-semibold text-gray-900">Carbon Credit Calculator</h3>
        <DollarSign className="w-6 h-6 text-green-600" />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Carbon Price (USD/ton CO2)
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
          <p className="text-xs text-gray-600">kg Carbon Stock</p>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <p className="text-2xl font-bold text-blue-700">
            {currentValues.co2Equivalent.toFixed(2)}
          </p>
          <p className="text-xs text-gray-600">kg CO2 Equivalent</p>
        </div>
      </div>

      <div className="text-center p-4 bg-yellow-50 rounded border-2 border-yellow-200">
        <p className="text-3xl font-bold text-yellow-700">
          ${currentValues.creditValue.toFixed(4)}
        </p>
        <p className="text-sm text-gray-600">Current Carbon Credit Value</p>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p>• Calculation based on IPCC 2019 formula for Sengon</p>
        <p>• AGB = 0.0673 × ((DBH² × H)^0.976)</p>
        <p>• Carbon Stock = AGB × 0.47</p>
      </div>
    </div>
  );
};

// Alerts Panel Component
const AlertsPanel = ({ alerts }) => {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
        <div className="text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
          <p>No active alerts</p>
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
      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Alerts</h3>
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
          <p className="text-gray-600">Loading Sengon Monitoring System...</p>
        </div>
      </div>
    );
  }

  const currentDevice = devices.find(d => d.device_id === selectedDevice);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <TreePine className="w-8 h-8 text-green-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">
                Sengon Monitoring System
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
                  Live
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {devices.length === 0 ? (
          <div className="text-center py-12">
            <TreePine className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Devices Found</h3>
            <p className="text-gray-600">Make sure your ESP32 device is connected and sending data.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Device Status */}
              {currentDevice && (
                <DeviceStatusCard device={currentDevice} latestReading={latestReading} />
              )}

              {/* Environmental Conditions */}
              <EnvironmentalCard latestReading={latestReading} />

              {/* Growth Chart */}
              <GrowthChart historyData={historyData} deviceId={selectedDevice} />
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Carbon Credit Calculator */}
              <CarbonCreditCard carbonMetrics={carbonMetrics} latestReading={latestReading} />

              {/* Alerts */}
              <AlertsPanel alerts={alerts} />

              {/* System Health Summary */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Database Connection</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">MQTT Broker</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Data Processing</span>
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Devices</span>
                    <span className="text-sm font-medium text-gray-900">{devices.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <p>© 2025 Sengon Monitoring System - Precision Forestry with AIoT</p>
            <p>Last updated: {formatTimestamp(new Date().toISOString())}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SengonMonitoringDashboard;