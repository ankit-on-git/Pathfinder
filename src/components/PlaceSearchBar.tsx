import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { MapPin, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LatLngLiteral } from '../types/parking';
import { isQuotaError, notifyQuotaExceeded } from '../utils/geo';

interface PlaceSearchBarProps {
  onSelectPlace: (place: {
    name: string;
    address: string;
    location: LatLngLiteral;
  }) => void;
  placeholder?: string;
}

export function PlaceSearchBar({
  onSelectPlace,
  placeholder = 'Where to?',
}: PlaceSearchBarProps) {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [query, setQuery] = useState<string>('');
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
    setOpen(false);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!placesLib || trimmed.length < 2) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }
        setIsLoading(true);
        const res = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: trimmed,
          sessionToken: sessionTokenRef.current,
        });
        setSuggestions(res.suggestions ?? []);
        setOpen(true);
      } catch (err) {
        if (isQuotaError(err)) {
          notifyQuotaExceeded();
        }
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [placesLib, query]);

  const handleSelectSuggestion = async (
    suggestion: google.maps.places.AutocompleteSuggestion
  ) => {
    if (!suggestion.placePrediction) return;
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      if (place.location) {
        onSelectPlace({
          name:
            place.displayName ||
            suggestion.placePrediction.text?.text ||
            'Selected Location',
          address: place.formattedAddress || '',
          location: {
            lat: place.location.lat(),
            lng: place.location.lng(),
          },
        });
      }
      setQuery('');
      resetSession();
    } catch (err) {
      if (isQuotaError(err)) {
        notifyQuotaExceeded();
      }
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <Search
          className="w-4 h-4 text-zinc-500 dark:text-zinc-400 absolute left-3.5 pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Search location"
          className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800 shadow-lg text-sm font-medium text-zinc-950 dark:text-zinc-50 placeholder:text-zinc-500 dark:placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              resetSession();
            }}
            aria-label="Clear search"
            className="absolute right-1.5 min-h-[36px] min-w-[36px] rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || isLoading) && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
          {isLoading && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Searching...
            </div>
          ) : (
            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-60 overflow-y-auto">
              {suggestions.map((suggestion, idx) => {
                const text = suggestion.placePrediction?.text?.text;
                if (!text) return null;
                return (
                  <li key={`${text}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => void handleSelectSuggestion(suggestion)}
                      className="w-full min-h-[44px] px-4 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center gap-3 text-sm text-zinc-900 dark:text-zinc-100 transition-colors"
                    >
                      <MapPin
                        className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">{text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
