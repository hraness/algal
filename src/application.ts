/** Filesystem application service. The lifecycle is shared with injected hosts. */
import { ApplicationCore, type ApplicationAdmission as PortableAdmission, type ApplicationOptions } from "./application-core";
import { FileApplicationStorage } from "./application-filesystem";
import type { FileStore } from "./store";
export * from "./application-core";

/** Preserve the filesystem service's admission context. Portable hosts import
 * ApplicationAdmission from application-core and receive their injected Store. */
export interface ApplicationAdmission {
  admitCommit(context: Omit<Parameters<PortableAdmission["admitCommit"]>[0], "store"> & { store: FileStore }): Promise<void>;
  admitDispatch?(context: Omit<Parameters<NonNullable<PortableAdmission["admitDispatch"]>>[0], "store"> & { store: FileStore }): Promise<unknown>;
}

export class ApplicationService extends ApplicationCore {
  readonly dir: string;
  declare readonly store: FileStore;
  constructor(dir: string, admission: ApplicationAdmission, options: ApplicationOptions = {}) {
    const storage = new FileApplicationStorage(dir);
    super(storage, admission, options);
    this.dir = storage.dir;
  }
}
