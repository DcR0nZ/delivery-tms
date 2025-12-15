import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Truck, MapPin, Package } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapPage() {
  const [jobs, setJobs] = useState([]);
  const [locationUpdates, setLocationUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [center] = useState([-37.8136, 144.9631]); // Melbourne default

  useEffect(() => {
    loadData();
    const interval = setInterval(loadLocationUpdates, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [jobsData, locationsData] = await Promise.all([
        base44.entities.Job.filter({
          status: { $in: ['SCHEDULED', 'IN_TRANSIT'] },
          deliveryLatitude: { $ne: null },
          deliveryLongitude: { $ne: null }
        }),
        base44.entities.LocationUpdate.list('-timestamp', 50)
      ]);
      
      setJobs(jobsData);
      setLocationUpdates(locationsData);
    } catch (error) {
      console.error('Error loading map data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationUpdates = async () => {
    try {
      const locations = await base44.entities.LocationUpdate.list('-timestamp', 50);
      setLocationUpdates(locations);
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      SCHEDULED: 'bg-blue-500',
      IN_TRANSIT: 'bg-green-500',
      DELIVERED: 'bg-gray-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Live Map</h1>
          <p className="text-gray-600 mt-1">Real-time job and vehicle tracking</p>
        </div>
        <div className="flex gap-4">
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Active Jobs</p>
                <p className="text-lg font-semibold">{jobs.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Live Vehicles</p>
                <p className="text-lg font-semibold">{locationUpdates.length}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card className="flex-1">
        <CardContent className="p-0 h-full">
          <MapContainer
            center={center}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Job Markers */}
            {jobs.map((job) => (
              <Marker
                key={job.id}
                position={[job.deliveryLatitude, job.deliveryLongitude]}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-sm mb-1">{job.customerName}</h3>
                    <p className="text-xs text-gray-600 mb-2">{job.deliveryLocation}</p>
                    <Badge className={`${getStatusColor(job.status)} text-white text-xs`}>
                      {job.status.replace(/_/g, ' ')}
                    </Badge>
                    {job.deliveryTypeName && (
                      <p className="text-xs text-gray-500 mt-1">{job.deliveryTypeName}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Vehicle Location Markers */}
            {locationUpdates.map((loc) => (
              <React.Fragment key={loc.id}>
                <Circle
                  center={[loc.latitude, loc.longitude]}
                  radius={loc.accuracy || 50}
                  pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                />
                <Marker position={[loc.latitude, loc.longitude]}>
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center gap-2 mb-1">
                        <Truck className="h-4 w-4 text-blue-600" />
                        <h3 className="font-semibold text-sm">{loc.userName || 'Driver'}</h3>
                      </div>
                      {loc.truckId && (
                        <p className="text-xs text-gray-600">Vehicle: {loc.truckId}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {new Date(loc.timestamp).toLocaleTimeString()}
                      </p>
                      {loc.speed && (
                        <p className="text-xs text-gray-500">
                          Speed: {(loc.speed * 3.6).toFixed(0)} km/h
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
          </MapContainer>
        </CardContent>
      </Card>
    </div>
  );
}