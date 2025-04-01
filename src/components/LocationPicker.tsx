import React, { useState, useCallback, useEffect } from 'react';
import { Map, Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Box, Typography, Button } from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';

// Mapbox token'ını doğrudan burada tanımlayalım
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFoc3Vtb3plciIsImEiOiJjbTh5cWs2cHcwM2pyMm1xeTJoeHZveXN5In0.ehx8ZdXpN2-LxR7ZqmMf0w";

interface LocationPickerProps {
  onLocationSelect: (location: { latitude: number; longitude: number }) => void;
  initialLocation?: { latitude: number; longitude: number };
}

const LocationPicker: React.FC<LocationPickerProps> = ({ onLocationSelect, initialLocation }) => {
  const [viewState, setViewState] = useState({
    latitude: initialLocation?.latitude || 41.0082,
    longitude: initialLocation?.longitude || 28.9784,
    zoom: 11
  });

  const [selectedLocation, setSelectedLocation] = useState(initialLocation || null);

  const handleMapClick = useCallback((event: any) => {
    if (event.lngLat) {
      const { lng, lat } = event.lngLat;
      setSelectedLocation({ latitude: lat, longitude: lng });
    }
  }, []);

  const handleViewStateChange = useCallback((newViewState: any) => {
    setViewState(newViewState);
  }, []);

  const handleConfirm = () => {
    if (selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  };

  return (
    <Box sx={{ height: '400px', width: '100%', position: 'relative' }}>
      <Map
        initialViewState={viewState}
        onMove={evt => handleViewStateChange(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/navigation-day-v1"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
        reuseMaps
      >
        {selectedLocation && (
          <Marker
            latitude={selectedLocation.latitude}
            longitude={selectedLocation.longitude}
            anchor="bottom"
          >
            <LocationOnIcon color="error" />
          </Marker>
        )}
      </Map>
      <Box
        sx={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'white',
          padding: 2,
          borderRadius: 1,
          boxShadow: 1,
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" gutterBottom>
          Haritada bir konum seçin
        </Typography>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedLocation}
          sx={{ mt: 1 }}
        >
          Konumu Onayla
        </Button>
      </Box>
    </Box>
  );
};

export default LocationPicker; 