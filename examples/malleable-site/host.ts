/** Filesystem convenience wrapper around the portable marketing lifecycle. */
import { ApplicationService } from "../../src/application";
import { FileApplicationStorage } from "../../src/application-filesystem";
import { MarketingCore, ownerEditAdmission } from "./core";
export * from "./core";

export class MarketingHost extends MarketingCore {
  declare readonly service: ApplicationService;
  constructor(readonly directory: string) {
    super(new FileApplicationStorage(directory), new ApplicationService(directory, ownerEditAdmission()));
  }
}
