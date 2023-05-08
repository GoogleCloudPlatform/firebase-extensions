export class Query {
  id: string;
  featureVector: number[];

  constructor(id: string, featureVector: number[]) {
    this.id = id;
    this.featureVector = featureVector;
  }

  toVertexQuery() {
    return {
      datapoint: {
        datapoint_id: this.id,
        feature_vector: this.featureVector,
      },
    };
  }
}
