/**

 * Point-in-time feature vectors — deterministic from instrumentId + asOf.

 * ALPHA scaffold. Not a production feature platform.

 */

export class InMemoryFeatureStore {

  getFeatureVector(instrumentId: string): Record<string, number> {

    return this.getFeatureVectorAsOf(instrumentId, "1970-01-01T00:00:00.000Z")

      .values as unknown as Record<string, number>;

  }



  getFeatureVectorAsOf(

    instrumentId: string,

    asOf: string

  ): {

    featureSetId: string;

    instrumentId: string;

    asOf: string;

    pointInTime: true;

    values: { priceNorm: number; vol: number; momentum: number };

    featureVersion: string;

  } {

    const seed =

      instrumentId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) +

      asOf.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

    const priceNorm = 0.5 + ((seed % 100) / 200);

    const vol = 0.1 + ((seed % 50) / 500);

    const momentum = ((seed % 21) - 10) / 100;

    return {

      featureSetId: `fs_${instrumentId}_${asOf}`,

      instrumentId,

      asOf,

      pointInTime: true,

      values: { priceNorm, vol, momentum },

      featureVersion: "pit-v1",

    };

  }

}



export const featureStore = new InMemoryFeatureStore();


