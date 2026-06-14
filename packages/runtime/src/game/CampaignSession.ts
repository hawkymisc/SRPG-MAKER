import {
  CampaignSaveDataSchema,
  type CampaignSaveData,
  type CampaignState,
} from "@srpg/shared";

export class CampaignSession {
  constructor(
    public state: CampaignState,
    public readonly seed: number,
  ) {}

  serialize(): CampaignSaveData {
    return CampaignSaveDataSchema.parse({
      version: 1,
      seed: this.seed,
      campaign: this.state,
    });
  }

  static deserialize(raw: unknown): CampaignSession {
    const data = CampaignSaveDataSchema.parse(raw);
    return new CampaignSession(data.campaign, data.seed);
  }
}
