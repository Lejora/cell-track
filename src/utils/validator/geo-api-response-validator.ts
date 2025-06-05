import { z } from "zod";

const geolocationAPIResponseSchema = z.object({
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  accuracy: z.number(),
});

export const geolocationAPIResponseParser = <T>(data: T) => {
  const parsedResult = geolocationAPIResponseSchema.safeParse(data);
  if (!parsedResult.success) {
    throw new Error(
      "Invalid Response from Geolocation API: " +
        JSON.stringify(parsedResult.error.errors)
    );
  }
  return parsedResult.data;
};
