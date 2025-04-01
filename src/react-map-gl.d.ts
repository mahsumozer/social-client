declare module 'react-map-gl' {
  import * as React from 'react';
  
  export interface MapProps {
    initialViewState?: any;
    viewState?: any;
    width?: string | number;
    height?: string | number;
    style?: React.CSSProperties;
    mapStyle?: string;
    mapboxAccessToken?: string;
    onClick?: (event: any) => void;
    onMove?: (event: any) => void;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export interface MarkerProps {
    latitude: number;
    longitude: number;
    anchor?: string;
    children?: React.ReactNode;
    [key: string]: any;
  }
  
  export const Marker: React.FC<MarkerProps>;
  
  const Map: React.FC<MapProps>;
  export default Map;
} 