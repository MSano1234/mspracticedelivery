/// <reference types="google.maps" />

import { useEffect, useRef, useState } from "react";
import {
  setOptions,
  importLibrary,
} from "@googlemaps/js-api-loader";

type LatLngLiteral = {
  lat: number;
  lng: number;
};

type LiveDeliveryMapProps = {
  deliveryId?: string;
  pickupAddress?: string;
  destinationAddress?: string;
  driverLatitude?: number | null;
  driverLongitude?: number | null;
};

const GOOGLE_MAPS_API_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

const SWIFTDROP_MAP_ID =
  "69e2dbe7fd20ec8ea8d21f2e";

const DEFAULT_CENTER: LatLngLiteral = {
  lat: 38.9072,
  lng: -77.0369,
};

/*
 * Google Maps JS API is loaded once.
 *
 * The current @googlemaps/js-api-loader v2 package
 * uses setOptions() + importLibrary().
 */
let googleMapsInitialized = false;

function initializeGoogleMaps() {
  if (googleMapsInitialized) {
    return;
  }

  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error(
      "VITE_GOOGLE_MAPS_API_KEY is missing from .env"
    );
  }

  setOptions({
    key: GOOGLE_MAPS_API_KEY,
    v: "weekly",
  });

  googleMapsInitialized = true;
}

function LiveDeliveryMap({
  deliveryId,
  pickupAddress,
  destinationAddress,
  driverLatitude,
  driverLongitude,
}: LiveDeliveryMapProps) {
  const mapElementRef =
    useRef<HTMLDivElement | null>(null);

  const mapRef =
    useRef<google.maps.Map | null>(null);

  const pickupMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(
      null
    );

  const destinationMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(
      null
    );

  const driverMarkerRef =
    useRef<google.maps.marker.AdvancedMarkerElement | null>(
      null
    );

  const routePolylinesRef =
    useRef<google.maps.Polyline[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [mapError, setMapError] =
    useState("");

  const [distanceMiles, setDistanceMiles] =
    useState<number | null>(null);

  const [etaMinutes, setEtaMinutes] =
    useState<number | null>(null);

  const [routeLoaded, setRouteLoaded] =
    useState(false);

  /*
   * Convert an address into coordinates.
   */
  async function geocodeAddress(
    address: string
  ): Promise<LatLngLiteral> {
    const { Geocoder } =
      (await importLibrary(
        "geocoding"
      )) as google.maps.GeocodingLibrary;

    const geocoder = new Geocoder();

    return new Promise(
      (resolve, reject) => {
        geocoder.geocode(
          { address },
          (
            results,
            status
          ) => {
            if (
              status !== "OK" ||
              !results ||
              results.length === 0
            ) {
              reject(
                new Error(
                  `Could not locate address: ${address}`
                )
              );

              return;
            }

            const location =
              results[0].geometry.location;

            resolve({
              lat: location.lat(),
              lng: location.lng(),
            });
          }
        );
      }
    );
  }

  /*
   * Create the pickup marker.
   */
  async function createPickupMarker(
    map: google.maps.Map,
    position: LatLngLiteral
  ) {
    const {
      AdvancedMarkerElement,
    } =
      (await importLibrary(
        "marker"
      )) as google.maps.MarkerLibrary;

    const element =
      document.createElement("div");

    element.textContent = "📍";

    element.style.fontSize = "34px";

    element.style.filter =
      "drop-shadow(0 2px 3px rgba(0,0,0,.25))";

    pickupMarkerRef.current =
      new AdvancedMarkerElement({
        map,
        position,
        title: "Pickup location",
        content: element,
      });
  }

  /*
   * Create destination marker.
   */
  async function createDestinationMarker(
    map: google.maps.Map,
    position: LatLngLiteral
  ) {
    const {
      AdvancedMarkerElement,
    } =
      (await importLibrary(
        "marker"
      )) as google.maps.MarkerLibrary;

    const element =
      document.createElement("div");

    element.textContent = "🏁";

    element.style.fontSize = "32px";

    element.style.filter =
      "drop-shadow(0 2px 3px rgba(0,0,0,.25))";

    destinationMarkerRef.current =
      new AdvancedMarkerElement({
        map,
        position,
        title: "Destination",
        content: element,
      });
  }

  /*
   * Create/update driver marker.
   */
  async function createDriverMarker(
    map: google.maps.Map,
    position: LatLngLiteral
  ) {
    const {
      AdvancedMarkerElement,
    } =
      (await importLibrary(
        "marker"
      )) as google.maps.MarkerLibrary;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.position =
        position;

      return;
    }

    const element =
      document.createElement("div");

    element.textContent = "🚚";

    element.style.fontSize = "32px";

    element.style.filter =
      "drop-shadow(0 2px 3px rgba(0,0,0,.3))";

    driverMarkerRef.current =
      new AdvancedMarkerElement({
        map,
        position,
        title: "Driver location",
        content: element,
      });
  }

  /*
   * Calculate the actual driving route.
   *
   * This uses Google's current Routes API
   * instead of the deprecated DirectionsService.
   */
  async function calculateRoute(
    map: google.maps.Map,
    origin: LatLngLiteral,
    destination: LatLngLiteral
  ) {
    try {
      const {
        Route,
      } =
        (await importLibrary(
          "routes"
        )) as google.maps.RoutesLibrary;

      const request: google.maps.routes.ComputeRoutesRequest =
        {
          origin,
          destination,

          travelMode: "DRIVING",

          routingPreference:
            "TRAFFIC_AWARE",

          computeAlternativeRoutes:
            false,

          fields: [
            "distanceMeters",
            "durationMillis",
            "path",
            "viewport",
          ],
        };

      const result =
        await Route.computeRoutes(
          request
        );

      if (
        !result.routes ||
        result.routes.length === 0
      ) {
        throw new Error(
          "No driving route was returned."
        );
      }

      const route =
        result.routes[0];

      /*
       * Distance.
       */
      if (
        typeof route.distanceMeters ===
        "number"
      ) {
        const miles =
          route.distanceMeters /
          1609.344;

        const roundedMiles =
          Math.round(miles * 10) / 10;

        setDistanceMiles(
          roundedMiles
        );
      }

      /*
       * ETA.
       */
      if (
        typeof route.durationMillis ===
        "number"
      ) {
        const minutes =
          route.durationMillis /
          60000;

        setEtaMinutes(
          Math.max(
            1,
            Math.round(minutes)
          )
        );
      }

      /*
       * Remove previous route lines.
       */
      routePolylinesRef.current.forEach(
        (polyline) => {
          polyline.setMap(null);
        }
      );

      routePolylinesRef.current = [];

      /*
       * Let Google create the route
       * polyline from the returned route.
       */
      const polylines =
        route.createPolylines({
          polylineOptions: {
            strokeOpacity: 0.9,
            strokeWeight: 6,
          },
        });

      polylines.forEach(
        (polyline) => {
          polyline.setMap(map);
        }
      );

      routePolylinesRef.current =
        polylines;

      /*
       * Fit the route into the map.
       */
      if (route.viewport) {
        map.fitBounds(
          route.viewport,
          70
        );
      }

      setRouteLoaded(true);

      console.log(
        "SwiftDrop route calculated:",
        {
          deliveryId,
          distanceMiles:
            route.distanceMeters
              ? route.distanceMeters /
                1609.344
              : null,
          etaMinutes:
            route.durationMillis
              ? route.durationMillis /
                60000
              : null,
        }
      );
    } catch (error) {
      console.error(
        "SwiftDrop Routes API failed:",
        error
      );

      setMapError(
        "Unable to calculate the delivery route."
      );
    }
  }

  /*
   * Initialize map.
   */
  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      try {
        setLoading(true);
        setMapError("");
        setRouteLoaded(false);

        initializeGoogleMaps();

        /*
         * Load the map library.
         */
        const {
          Map,
        } =
          (await importLibrary(
            "maps"
          )) as google.maps.MapsLibrary;

        if (
          cancelled ||
          !mapElementRef.current
        ) {
          return;
        }

        /*
         * Create map.
         */
        const map =
          new Map(
            mapElementRef.current,
            {
              center:
                DEFAULT_CENTER,

              zoom: 11,

              mapId:
                SWIFTDROP_MAP_ID,

              mapTypeControl:
                false,

              streetViewControl:
                false,

              fullscreenControl:
                true,

              zoomControl:
                true,
            }
          );

        mapRef.current = map;

        /*
         * We need both addresses.
         */
        if (
          !pickupAddress ||
          !destinationAddress
        ) {
          setLoading(false);

          return;
        }

        /*
         * Geocode both addresses.
         */
        const [
          pickupLocation,
          destinationLocation,
        ] =
          await Promise.all([
            geocodeAddress(
              pickupAddress
            ),
            geocodeAddress(
              destinationAddress
            ),
          ]);

        if (cancelled) {
          return;
        }

        /*
         * Add pickup marker.
         */
        await createPickupMarker(
          map,
          pickupLocation
        );

        /*
         * Add destination marker.
         */
        await createDestinationMarker(
          map,
          destinationLocation
        );

        /*
         * Add driver marker if
         * coordinates are available.
         */
        if (
          typeof driverLatitude ===
            "number" &&
          typeof driverLongitude ===
            "number"
        ) {
          await createDriverMarker(
            map,
            {
              lat: driverLatitude,
              lng: driverLongitude,
            }
          );
        }

        /*
         * Fit pickup/destination
         * into the map initially.
         */
        const {
          LatLngBounds,
        } =
          (await importLibrary(
            "core"
          )) as google.maps.CoreLibrary;

        const bounds =
          new LatLngBounds();

        bounds.extend(
          pickupLocation
        );

        bounds.extend(
          destinationLocation
        );

        if (
          typeof driverLatitude ===
            "number" &&
          typeof driverLongitude ===
            "number"
        ) {
          bounds.extend({
            lat: driverLatitude,
            lng: driverLongitude,
          });
        }

        map.fitBounds(
          bounds,
          70
        );

        /*
         * Calculate actual route.
         */
        await calculateRoute(
          map,
          pickupLocation,
          destinationLocation
        );

        if (!cancelled) {
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "LiveDeliveryMap initialization failed:",
          error
        );

        if (!cancelled) {
          setMapError(
            error instanceof Error
              ? error.message
              : "Unable to load delivery map."
          );

          setLoading(false);
        }
      }
    }

    initializeMap();

    return () => {
      cancelled = true;

      /*
       * Remove markers.
       */
      if (
        pickupMarkerRef.current
      ) {
        pickupMarkerRef.current.map =
          null;
      }

      if (
        destinationMarkerRef.current
      ) {
        destinationMarkerRef.current.map =
          null;
      }

      if (
        driverMarkerRef.current
      ) {
        driverMarkerRef.current.map =
          null;
      }

      /*
       * Remove route.
       */
      routePolylinesRef.current.forEach(
        (polyline) => {
          polyline.setMap(null);
        }
      );

      routePolylinesRef.current =
        [];

      mapRef.current = null;
    };
  }, [
    pickupAddress,
    destinationAddress,
  ]);

  /*
   * Update driver location without
   * rebuilding the entire map.
   */
  useEffect(() => {
    if (
      !mapRef.current ||
      typeof driverLatitude !==
        "number" ||
      typeof driverLongitude !==
        "number"
    ) {
      return;
    }

    createDriverMarker(
      mapRef.current,
      {
        lat: driverLatitude,
        lng: driverLongitude,
      }
    );
  }, [
    driverLatitude,
    driverLongitude,
  ]);

  /*
   * SwiftDrop base pricing:
   *
   * $1 per mile.
   *
   * Minimum fare currently $5.
   *
   * We will later add a simple
   * congestion/weather multiplier.
   */
  const estimatedPrice =
    distanceMiles !== null
      ? Math.max(
          5,
          Math.round(
            distanceMiles * 100
          ) / 100
        )
      : null;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background:
          "#eef3f8",
      }}
    >
      <div
        ref={mapElementRef}
        style={{
          width: "100%",
          height: "100%",
        }}
      />

      {loading && (
        <div
          style={{
            position:
              "absolute",
            inset: 0,
            display: "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            background:
              "rgba(255,255,255,.75)",
            zIndex: 5,
          }}
        >
          <div
            style={{
              background:
                "#ffffff",
              padding:
                "16px 24px",
              borderRadius:
                "12px",
              boxShadow:
                "0 4px 20px rgba(0,0,0,.12)",
              fontWeight: 600,
            }}
          >
            Loading live
            delivery map...
          </div>
        </div>
      )}

      {mapError && (
        <div
          style={{
            position:
              "absolute",
            left: "50%",
            bottom: "24px",
            transform:
              "translateX(-50%)",
            width:
              "min(90%, 600px)",
            background:
              "#ffffff",
            padding:
              "14px 18px",
            borderRadius:
              "12px",
            boxShadow:
              "0 4px 20px rgba(0,0,0,.12)",
            zIndex: 10,
            textAlign:
              "center",
          }}
        >
          <strong>
            SwiftDrop map
            notice
          </strong>

          <div
            style={{
              marginTop:
                "5px",
              color:
                "#64748b",
              fontSize:
                "14px",
            }}
          >
            {mapError}
          </div>
        </div>
      )}

      {routeLoaded && (
        <div
          style={{
            position:
              "absolute",
            left: "20px",
            bottom: "20px",
            background:
              "#ffffff",
            borderRadius:
              "14px",
            padding:
              "12px 16px",
            boxShadow:
              "0 4px 16px rgba(0,0,0,.15)",
            zIndex: 5,
            minWidth:
              "210px",
          }}
        >
          <div
            style={{
              fontSize:
                "12px",
              fontWeight: 700,
              color:
                "#64748b",
              letterSpacing:
                "1px",
            }}
          >
            SWIFTDROP
          </div>

          <div
            style={{
              display:
                "flex",
              gap: "18px",
              marginTop:
                "6px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#64748b",
                }}
              >
                DISTANCE
              </div>

              <strong>
                {distanceMiles !==
                null
                  ? `${distanceMiles} mi`
                  : "—"}
              </strong>
            </div>

            <div>
              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#64748b",
                }}
              >
                ETA
              </div>

              <strong>
                {etaMinutes !==
                null
                  ? `${etaMinutes} min`
                  : "—"}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop:
                "8px",
              paddingTop:
                "8px",
              borderTop:
                "1px solid #e2e8f0",
              fontSize:
                "13px",
              color:
                "#475569",
            }}
          >
            Base delivery:{" "}
            <strong>
              {estimatedPrice !==
              null
                ? `$${estimatedPrice.toFixed(
                    2
                  )}`
                : "—"}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveDeliveryMap;