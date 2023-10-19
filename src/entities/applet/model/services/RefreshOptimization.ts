import { QueryClient } from '@tanstack/react-query';

import { AppletDto, AppletsResponse } from '@app/shared/api';
import { getAppletsKey, getDataFromQuery } from '@app/shared/lib';

type AppletVersion = {
  id: string;
  version: string;
};

class RefreshOptimization {
  private keptVersions: Array<AppletVersion>;
  private queryClient: QueryClient;

  constructor(queryClient: QueryClient) {
    this.keptVersions = [];
    this.queryClient = queryClient;
  }

  private getKeptVersion(appletId: string): string | null {
    return this.keptVersions.find(x => x.id === appletId)?.version ?? null;
  }

  public keepExistingAppletVersions() {
    const appletsResponse = getDataFromQuery<AppletsResponse>(
      getAppletsKey(),
      this.queryClient,
    );

    if (!appletsResponse) {
      this.keptVersions = [];
      return;
    }

    this.keptVersions = appletsResponse.result.map<AppletVersion>(x => ({
      id: x.id,
      version: x.version,
    }));
  }

  public shouldBeFullyUpdated(applet: AppletDto): boolean {
    const keptVersion = this.getKeptVersion(applet.id);
    return keptVersion === null || keptVersion !== applet.version;
  }
}

export default RefreshOptimization;
