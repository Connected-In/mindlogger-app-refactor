import { AxiosResponse } from 'axios';

import {
  ActivityDto,
  ActivityResponse,
  ActivityService,
  AppletDetailsResponse,
  AppletEventsResponse,
} from '@app/shared/api';
import { EventsService, AppletsService, AppletDto } from '@app/shared/api';
import {
  collectActivityDetailsImageUrls,
  collectAppletDetailsImageUrls,
  collectAppletRecordImageUrls,
} from '@app/shared/lib';

export type CollectAppletInternalsResult = {
  appletId: string;
  appletDetailsResponse: AxiosResponse<AppletDetailsResponse>;
  activities: CollectActivityDetailsResult[];
  imageUrls: string[];
};

export type CollectAppletEventsResult = {
  appletId: string;
  eventsResponse: AxiosResponse<AppletEventsResponse>;
};

export type CollectActivityDetailsResult = {
  imageUrls: string[];
  activityDetailsResponse: AxiosResponse<ActivityResponse>;
};

type IdName = { name: string; id: string };

type AppletId = string;

export type CollectAllAppletEventsResult = {
  appletEvents: Record<AppletId, AxiosResponse<AppletEventsResponse>>;
};

export interface IRefreshDataCollector {
  collectAppletInternals(
    appletDto: AppletDto,
  ): Promise<CollectAppletInternalsResult>;
  collectAllAppletsEvents(
    applets: IdName[],
  ): Promise<CollectAllAppletEventsResult>;
}

class RefreshDataCollector implements IRefreshDataCollector {
  constructor() {}

  private async collectActivityDetails(
    activityId: string,
  ): Promise<CollectActivityDetailsResult | null> {
    try {
      const activityDetailsResponse = await ActivityService.getById(activityId);

      const activityDto: ActivityDto = activityDetailsResponse.data.result;

      const imageUrls: string[] = collectActivityDetailsImageUrls(activityDto);

      return {
        activityDetailsResponse,
        imageUrls,
      };
    } catch {
      return Promise.resolve(null);
    }
  }

  private async collectAppletDetailsWithEvents(
    appletDto: AppletDto,
  ): Promise<CollectAppletInternalsResult> {
    const appletId = appletDto.id;

    const appletDetailsResponse = await AppletsService.getAppletDetails({
      appletId,
    });

    const appletDetailsDto = appletDetailsResponse.data.result;

    const imageUrls: string[] = collectAppletDetailsImageUrls(appletDetailsDto);

    return {
      appletId: appletDto.id,
      appletDetailsResponse,
      imageUrls,
      activities: [],
    };
  }

  private splitArray<T>(bulkSize: number, array: T[]): Array<T[]> {
    const result: Array<T[]> = [];
    for (let i = 0; i < array.length; i += bulkSize) {
      result.push(array.slice(i, i + bulkSize));
    }
    return result;
  }

  public async collectAllAppletsEvents(
    applets: Array<IdName>,
  ): Promise<CollectAllAppletEventsResult> {
    const bulkSize = 10;

    const result: CollectAllAppletEventsResult = {
      appletEvents: {},
    };

    const appletArrays = this.splitArray<IdName>(bulkSize, applets);

    for (let appletsArray of appletArrays) {
      const promises = [];

      for (let applet of appletsArray) {
        promises.push(this.collectEvents(applet));
      }

      const bulkResults = await Promise.all(promises);

      if (bulkResults.some(x => x.response == null)) {
        throw new Error(
          '[RefreshDataCollector.collectAllAppletsEvents]: Error occurred during getting applet events',
        );
      }

      bulkResults.forEach(r => {
        result.appletEvents[r.appletId] = r.response!;
      });
    }

    return result;
  }

  public async collectEvents(applet: IdName): Promise<{
    appletId: string;
    response: AxiosResponse<AppletEventsResponse> | null;
  }> {
    try {
      const response = await EventsService.getEvents({ appletId: applet.id });
      return {
        response,
        appletId: applet.id,
      };
    } catch (error) {
      console.warn(
        `[RefreshDataCollector.collectEvents]: Error occurred for applet "${applet.name}|${applet.id}":\n\n` +
          error,
      );
      return {
        appletId: applet.id,
        response: null,
      };
    }
  }

  public async collectAppletInternals(
    appletDto: AppletDto,
  ): Promise<CollectAppletInternalsResult> {
    const imageUrls: string[] = collectAppletRecordImageUrls(appletDto);

    let collectResult: CollectAppletInternalsResult;

    try {
      collectResult = await this.collectAppletDetailsWithEvents(appletDto);
    } catch (error) {
      throw new Error(
        `[RefreshDataCollector.refreshApplet] Error occurred during getting applet's "${appletDto.displayName}" details or events`,
      );
    }

    collectResult.imageUrls = collectResult.imageUrls.concat(imageUrls);

    const appletDetailsDto = collectResult.appletDetailsResponse.data.result;

    const activityIds: string[] = appletDetailsDto.activities.map(x => x.id);

    const promises: Promise<CollectActivityDetailsResult | null>[] = [];

    for (let activityId of activityIds) {
      const promise = this.collectActivityDetails(activityId);
      promises.push(promise);
    }

    const collectActivityResults = await Promise.all(promises);

    if (collectActivityResults.some(x => x === null)) {
      throw new Error(
        `[RefreshDataCollector.refreshApplet] Error occurred during getting applet' "${appletDto.displayName}" activities`,
      );
    }

    collectResult.activities = collectActivityResults.map(x => x!);

    return collectResult;
  }
}

export default RefreshDataCollector;
