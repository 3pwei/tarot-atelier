/**
 * Where the reading endpoint is served, below the site's base path, and the
 * build switch that makes the browser call it. The browser and the build
 * scripts both read this file, so it has no imports.
 */
export const READINGS_ROUTE = "api/v1/readings";

/** NEXT_PUBLIC_AI_READINGS has this value in builds that ship the endpoint. */
export const AI_READINGS_ON = "on";
