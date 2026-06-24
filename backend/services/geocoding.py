import time
from typing import Tuple, Optional
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

_geocode_cache = {}

def geocode_location(location_str: str) -> Tuple[Optional[float], Optional[float]]:
    """Converts a location string to (lat, lng). Caches results."""
    if not location_str:
        return None, None
        
    location_str = location_str.strip()
    if location_str in _geocode_cache:
        return _geocode_cache[location_str]
        
    try:
        # Nominatim asks to use a unique user-agent
        geolocator = Nominatim(user_agent="lead_qualification_agent_v2")
        # Add delay for rate limiting of Nominatim free service
        time.sleep(1)
        location = geolocator.geocode(location_str, timeout=5)
        if location:
            result = (location.latitude, location.longitude)
            _geocode_cache[location_str] = result
            return result
    except (GeocoderTimedOut, GeocoderServiceError) as e:
        print(f"Geocoding error for {location_str}: {e}")
        
    # Return defaults if Nominatim fails or times out
    # Let's provide some mock fallbacks for common cities to make it robust in offline/mock settings
    fallbacks = {
        "Austin, TX": (30.2672, -97.7431),
        "London, UK": (51.5074, -0.1278),
        "Bangalore, India": (12.9716, 77.5946),
        "Stockholm, Sweden": (59.3293, 18.0686),
        "New York, NY": (40.7128, -74.0060),
        "San Francisco, CA": (37.7749, -122.4194),
        "Berlin, Germany": (52.5200, 13.4050),
        "Chicago, IL": (41.8781, -87.6298),
        "Los Angeles, CA": (34.0522, -118.2437),
        "Mumbai, India": (19.0760, 72.8777),
    }
    
    for key, coords in fallbacks.items():
        if key.lower() in location_str.lower():
            _geocode_cache[location_str] = coords
            return coords
            
    return None, None
